import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, SYSTEM_PROMPT_OPEN_BOOK, buildUserRequestText, buildOpenBookUserRequestText } from './generationPrompt.js';
import {
  parseGeneratedPayload,
  sleep,
  getParseRetryAttempts,
  stripJsonFences,
} from './generationParse.js';

/** Output budget for Claude; large JSON needs a high ceiling or the model truncates mid-string. */
function resolveMaxOutputTokens() {
  const raw = process.env.CLAUDE_MAX_OUTPUT_TOKENS;
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 4096) return Math.min(n, 128000);
  return 64000;
}

export async function generateQuestion({
  apiKey,
  model,
  functionality,
  testCaseCount,
  screenshotImages = [],
  appApiBaseUrls = '',
  appApiEndpoints = '',
  assessmentMode = 'topin_base',
}) {
  const client = new Anthropic({ apiKey });
  const resolvedModel = model || 'claude-haiku-4-5-20251001';
  const isOpenBook = assessmentMode === 'open_book';
  const systemPrompt = isOpenBook ? SYSTEM_PROMPT_OPEN_BOOK : SYSTEM_PROMPT;

  const userContent = [];

  for (const img of screenshotImages) {
    if (!img?.base64) continue;
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mediaType || 'image/png',
        data: img.base64,
      },
    });
  }

  userContent.push({
    type: 'text',
    text: isOpenBook
      ? buildOpenBookUserRequestText({ functionality, appApiBaseUrls, appApiEndpoints })
      : buildUserRequestText({ testCaseCount, functionality, appApiBaseUrls, appApiEndpoints }),
  });

  const maxTokens = resolveMaxOutputTokens();
  const parseAttempts = getParseRetryAttempts();

  let lastParseError = null;

  for (let attempt = 1; attempt <= parseAttempts; attempt++) {
    const stream = client.messages.stream({
      model: resolvedModel,
      max_tokens: maxTokens,
      temperature: 0,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userContent }],
    });

    const response = await stream.finalMessage();

    const outTok = response.usage?.output_tokens ?? 0;
    const meta = { outputTokens: outTok, stopReason: response.stop_reason };

    if (response.stop_reason === 'max_tokens') {
      throw new Error(
        `Claude stopped at the output token limit (${maxTokens} max, used ${outTok}). The JSON was cut off. Set CLAUDE_MAX_OUTPUT_TOKENS higher (if the model allows), reduce test cases, or simplify the app.`
      );
    }

    const textBlock = response.content?.find((b) => b.type === 'text');
    const rawText = (textBlock?.text ?? '').trim();
    if (!rawText) {
      throw new Error('Claude returned no text content. Check the model name and API response.');
    }

    const jsonText = stripJsonFences(rawText);

    try {
      return parseGeneratedPayload(jsonText, meta);
    } catch (err) {
      lastParseError = err;
      const retriable =
        attempt < parseAttempts &&
        response.stop_reason !== 'max_tokens' &&
        /Unterminated|Unexpected end|parse|JSON/i.test(String(err.message));
      if (retriable) {
        await sleep(350 * attempt);
        continue;
      }
      throw err;
    }
  }

  throw lastParseError ?? new Error('Failed to obtain valid JSON from Claude.');
}
