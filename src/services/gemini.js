import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT, SYSTEM_PROMPT_OPEN_BOOK, buildUserRequestText, buildOpenBookUserRequestText } from './generationPrompt.js';
import {
  parseGeneratedPayload,
  sleep,
  getParseRetryAttempts,
  stripJsonFences,
} from './generationParse.js';

function resolveGeminiMaxOutputTokens() {
  const raw = process.env.GEMINI_MAX_OUTPUT_TOKENS;
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 2048) return Math.min(n, 65536);
  return 65536;
}

export async function generateQuestionGemini({
  apiKey,
  model,
  functionality,
  testCaseCount,
  screenshotImages = [],
  appApiBaseUrls = '',
  appApiEndpoints = '',
  assessmentMode = 'topin_base',
}) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const resolvedModel = model || 'gemini-2.0-flash';
  const maxTokens = resolveGeminiMaxOutputTokens();
  const parseAttempts = getParseRetryAttempts();
  const isOpenBook = assessmentMode === 'open_book';

  const modelInstance = genAI.getGenerativeModel({
    model: resolvedModel,
    systemInstruction: isOpenBook ? SYSTEM_PROMPT_OPEN_BOOK : SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  });

  const parts = [];
  for (const img of screenshotImages) {
    if (!img?.base64) continue;
    parts.push({
      inlineData: {
        data: img.base64,
        mimeType: img.mediaType || 'image/png',
      },
    });
  }
  parts.push({
    text: isOpenBook
      ? buildOpenBookUserRequestText({
          functionality,
          appApiBaseUrls,
          appApiEndpoints,
          hasScreenshots: screenshotImages.some((img) => img?.base64),
        })
      : buildUserRequestText({
          testCaseCount,
          functionality,
          appApiBaseUrls,
          appApiEndpoints,
          hasScreenshots: screenshotImages.some((img) => img?.base64),
        }),
  });

  let lastParseError = null;

  for (let attempt = 1; attempt <= parseAttempts; attempt++) {
    let result;
    try {
      result = await modelInstance.generateContent({
        contents: [{ role: 'user', parts }],
      });
    } catch (e) {
      const msg = e?.message || String(e);
      if (/429|Too Many Requests|quota|Quota exceeded|RESOURCE_EXHAUSTED|free_tier.*limit:\s*0/i.test(msg)) {
        throw new Error(
          `Gemini quota or rate limit. On a free API key, avoid "Pro" models (they often have no free-tier quota — use Gemini 2.0 Flash or 2.5 Flash), wait and retry, or enable billing in Google AI Studio. Original: ${msg.slice(0, 500)}`
        );
      }
      throw e;
    }

    const response = result.response;
    const cand = response.candidates?.[0];
    const finishReason = cand?.finishReason ?? '';

    if (finishReason === 'MAX_TOKENS') {
      const used = response.usageMetadata?.candidatesTokenCount ?? '?';
      throw new Error(
        `Gemini hit the output token limit (${maxTokens} max, candidate tokens≈${used}). Set GEMINI_MAX_OUTPUT_TOKENS or reduce test cases / scope.`
      );
    }

    if (finishReason === 'SAFETY' || finishReason === 'BLOCKLIST' || finishReason === 'PROHIBITED_CONTENT') {
      throw new Error(
        `Gemini blocked the response (finishReason=${finishReason}). Adjust screenshots or prompt, or try another model.`
      );
    }

    let rawText = '';
    try {
      rawText = response.text().trim();
    } catch (e) {
      throw new Error(`Gemini returned no text (blocked or empty). ${e.message}`);
    }

    const outTok = response.usageMetadata?.candidatesTokenCount ?? 0;
    const meta = { outputTokens: outTok, stopReason: finishReason || 'STOP' };

    const jsonText = stripJsonFences(rawText);

    try {
      return parseGeneratedPayload(jsonText, meta);
    } catch (err) {
      lastParseError = err;
      const retriable =
        attempt < parseAttempts &&
        finishReason !== 'MAX_TOKENS' &&
        /Unterminated|Unexpected end|parse|JSON/i.test(String(err.message));
      if (retriable) {
        await sleep(350 * attempt);
        continue;
      }
      throw err;
    }
  }

  throw lastParseError ?? new Error('Failed to obtain valid JSON from Gemini.');
}
