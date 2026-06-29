import OpenAI from 'openai';
import {
  SYSTEM_PROMPT,
  SYSTEM_PROMPT_OPEN_BOOK,
  buildUserRequestText,
  buildOpenBookUserRequestText,
} from './generationPrompt.js';
import {
  parseGeneratedPayload,
  sleep,
  getParseRetryAttempts,
  stripJsonFences,
} from './generationParse.js';

const PROVIDER_CONFIG = {
  deepseek: {
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    defaultModel: 'deepseek-v4-flash',
    maxTokensEnv: 'DEEPSEEK_MAX_OUTPUT_TOKENS',
    defaultMaxTokens: 64000,
    label: 'DeepSeek',
  },
  grok: {
    baseURL: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
    defaultModel: 'grok-3-mini',
    maxTokensEnv: 'GROK_MAX_OUTPUT_TOKENS',
    defaultMaxTokens: 64000,
    label: 'Grok',
  },
  openrouter: {
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.0-flash-001',
    maxTokensEnv: 'OPENROUTER_MAX_OUTPUT_TOKENS',
    defaultMaxTokens: 64000,
    label: 'OpenRouter',
  },
};

function resolveMaxOutputTokens(envKey, fallback) {
  const raw = process.env[envKey];
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 4096) return Math.min(n, 128000);
  return fallback;
}

function buildUserMessageContent(screenshotImages, userText) {
  const imageParts = [];
  for (const img of screenshotImages) {
    if (!img?.base64) continue;
    const mime = img.mediaType || 'image/png';
    imageParts.push({
      type: 'image_url',
      image_url: { url: `data:${mime};base64,${img.base64}` },
    });
  }
  if (!imageParts.length) return userText;
  return [...imageParts, { type: 'text', text: userText }];
}

function deepseekExtraBody(model) {
  if (/reasoner|v4-pro/i.test(model || '')) {
    return { thinking: { type: 'enabled' } };
  }
  return undefined;
}

function createClient(provider, apiKey, config) {
  const opts = { apiKey, baseURL: config.baseURL };
  if (provider === 'openrouter') {
    opts.defaultHeaders = {
      'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:5173',
      'X-Title': process.env.OPENROUTER_APP_TITLE || 'React Question Generator',
    };
  }
  return new OpenAI(opts);
}

async function createChatCompletion(client, { model, systemPrompt, userContent, maxTokens, provider }) {
  const base = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0,
    max_tokens: maxTokens,
  };

  const extra = provider === 'deepseek' ? deepseekExtraBody(model) : undefined;
  if (extra) base.extra_body = extra;

  try {
    return await client.chat.completions.create({
      ...base,
      response_format: { type: 'json_object' },
    });
  } catch (e) {
    const msg = e?.message || String(e);
    if (!/response_format|json_object|unsupported/i.test(msg)) throw e;
    return client.chat.completions.create(base);
  }
}

export async function generateQuestionOpenAICompatible(provider, params) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) throw new Error(`Unknown OpenAI-compatible provider: ${provider}`);

  const {
    apiKey,
    model,
    functionality,
    testCaseCount,
    screenshotImages = [],
    appApiBaseUrls = '',
    appApiEndpoints = '',
    assessmentMode = 'topin_base',
  } = params;

  const client = createClient(provider, apiKey, config);
  const resolvedModel = model || config.defaultModel;
  const isOpenBook = assessmentMode === 'open_book';
  const systemPrompt = isOpenBook ? SYSTEM_PROMPT_OPEN_BOOK : SYSTEM_PROMPT;
  const userText = isOpenBook
    ? buildOpenBookUserRequestText({ functionality, appApiBaseUrls, appApiEndpoints })
    : buildUserRequestText({ testCaseCount, functionality, appApiBaseUrls, appApiEndpoints });

  const userContent = buildUserMessageContent(screenshotImages, userText);
  const maxTokens = resolveMaxOutputTokens(config.maxTokensEnv, config.defaultMaxTokens);
  const parseAttempts = getParseRetryAttempts();
  let lastParseError = null;

  for (let attempt = 1; attempt <= parseAttempts; attempt++) {
    let completion;
    try {
      completion = await createChatCompletion(client, {
        model: resolvedModel,
        systemPrompt,
        userContent,
        maxTokens,
        provider,
      });
    } catch (e) {
      const msg = e?.message || String(e);
      if (/429|rate limit|quota/i.test(msg)) {
        throw new Error(`${config.label} rate limit or quota exceeded. Wait and retry, or switch model. ${msg.slice(0, 400)}`);
      }
      throw e;
    }

    const choice = completion.choices?.[0];
    const rawText = (choice?.message?.content ?? '').trim();
    const finishReason = choice?.finish_reason ?? '';

    if (finishReason === 'length') {
      throw new Error(
        `${config.label} hit the output token limit (${maxTokens} max). Reduce test cases or simplify the app.`,
      );
    }
    if (!rawText) {
      throw new Error(`${config.label} returned no text. Check the model name and API key.`);
    }

    const meta = {
      outputTokens: completion.usage?.completion_tokens ?? 0,
      stopReason: finishReason || 'stop',
    };

    try {
      return parseGeneratedPayload(stripJsonFences(rawText), meta);
    } catch (err) {
      lastParseError = err;
      const retriable =
        attempt < parseAttempts &&
        finishReason !== 'length' &&
        /Unterminated|Unexpected end|parse|JSON/i.test(String(err.message));
      if (retriable) {
        await sleep(350 * attempt);
        continue;
      }
      throw err;
    }
  }

  throw lastParseError ?? new Error(`Failed to obtain valid JSON from ${config.label}.`);
}

export function generateQuestionDeepseek(params) {
  return generateQuestionOpenAICompatible('deepseek', params);
}

export function generateQuestionGrok(params) {
  return generateQuestionOpenAICompatible('grok', params);
}

export function generateQuestionOpenrouter(params) {
  return generateQuestionOpenAICompatible('openrouter', params);
}
