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

const CURSOR_API_BASE = (process.env.CURSOR_API_BASE_URL || 'https://api.cursor.com').replace(/\/+$/, '');
const TERMINAL_RUN_STATUSES = new Set(['FINISHED', 'ERROR', 'CANCELLED', 'EXPIRED']);
const POLL_MS = 2500;
const DEFAULT_MAX_WAIT_MS = 15 * 60 * 1000;

function cursorHeaders(apiKey) {
  const key = apiKey?.trim();
  if (!key) throw new Error('Cursor API key is required');
  return {
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function cursorFetch(apiKey, path, options = {}) {
  const res = await fetch(`${CURSOR_API_BASE}${path}`, {
    ...options,
    headers: { ...cursorHeaders(apiKey), ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error?.message || body?.message || JSON.stringify(body).slice(0, 300);
    throw new Error(`Cursor API failed (${res.status}): ${msg}`);
  }
  return body;
}

function mapCursorImages(screenshotImages) {
  const images = [];
  for (const img of screenshotImages || []) {
    if (!img?.base64) continue;
    images.push({
      data: img.base64,
      mimeType: img.mediaType || 'image/png',
    });
    if (images.length >= 5) break;
  }
  return images.length ? images : undefined;
}

function buildGenerationPrompt({
  assessmentMode,
  functionality,
  testCaseCount,
  appApiBaseUrls,
  appApiEndpoints,
  hasScreenshots,
}) {
  const isOpenBook = assessmentMode === 'open_book';
  const systemPrompt = isOpenBook ? SYSTEM_PROMPT_OPEN_BOOK : SYSTEM_PROMPT;
  const userText = isOpenBook
    ? buildOpenBookUserRequestText({
        functionality,
        appApiBaseUrls,
        appApiEndpoints,
        hasScreenshots,
      })
    : buildUserRequestText({
        testCaseCount,
        functionality,
        appApiBaseUrls,
        appApiEndpoints,
        hasScreenshots,
      });

  return `${systemPrompt}

Respond with ONLY valid JSON matching the schema above. Do not use tools, write files, or add commentary outside the JSON.

${userText}`;
}

async function waitForRunResult(apiKey, agentId, runId, maxWaitMs = DEFAULT_MAX_WAIT_MS) {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const run = await cursorFetch(apiKey, `/v1/agents/${agentId}/runs/${runId}`);
    if (TERMINAL_RUN_STATUSES.has(run.status)) {
      return run;
    }
    await sleep(POLL_MS);
  }
  throw new Error('Cursor Cloud Agent timed out waiting for a response. Try a faster model or retry.');
}

async function runCursorAgentPrompt(apiKey, { promptText, model, images }) {
  const payload = {
    name: 'React Question Generator',
    prompt: {
      text: promptText,
      ...(images ? { images } : {}),
    },
    ...(model ? { model: { id: model } } : {}),
  };

  const created = await cursorFetch(apiKey, '/v1/agents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const agentId = created?.agent?.id;
  const runId = created?.run?.id || created?.agent?.latestRunId;
  if (!agentId || !runId) {
    throw new Error('Cursor API did not return an agent run id.');
  }

  return waitForRunResult(apiKey, agentId, runId);
}

/**
 * @param {string} [apiKey]
 * @returns {Promise<Array<{ id: string, name: string, group: string }>>}
 */
export async function listCursorModels(apiKey) {
  const json = await cursorFetch(apiKey, '/v1/models');
  const items = Array.isArray(json?.items) ? json.items : [];

  return items
    .map((m) => ({
      id: m.id,
      name: m.displayName || m.id,
      group: 'Cursor',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function generateQuestionCursor(params) {
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

  const hasScreenshots = screenshotImages.some((img) => img?.base64);
  const promptText = buildGenerationPrompt({
    assessmentMode,
    functionality,
    testCaseCount,
    appApiBaseUrls,
    appApiEndpoints,
    hasScreenshots,
  });
  const images = mapCursorImages(screenshotImages);
  const resolvedModel = model || 'composer-2';
  const parseAttempts = getParseRetryAttempts();
  let lastParseError = null;

  for (let attempt = 1; attempt <= parseAttempts; attempt++) {
    let run;
    try {
      run = await runCursorAgentPrompt(apiKey, {
        promptText,
        model: resolvedModel,
        images,
      });
    } catch (e) {
      const msg = e?.message || String(e);
      if (/429|rate limit/i.test(msg)) {
        throw new Error(`Cursor rate limit exceeded. Wait and retry. ${msg.slice(0, 300)}`);
      }
      throw e;
    }

    if (run.status !== 'FINISHED') {
      throw new Error(`Cursor Cloud Agent ended with status "${run.status}".`);
    }

    const rawText = (run.result || '').trim();
    if (!rawText) {
      throw new Error('Cursor returned no text. Check the model and API key permissions.');
    }

    const meta = {
      outputTokens: run.usage?.outputTokens ?? 0,
      stopReason: 'stop',
    };

    try {
      return parseGeneratedPayload(stripJsonFences(rawText), meta);
    } catch (err) {
      lastParseError = err;
      if (attempt < parseAttempts && /Unterminated|Unexpected end|parse|JSON/i.test(String(err.message))) {
        await sleep(500 * attempt);
        continue;
      }
      throw err;
    }
  }

  throw lastParseError ?? new Error('Failed to obtain valid JSON from Cursor.');
}

export async function repairSolutionWithCursor({ apiKey, model, systemPrompt, userText }) {
  const promptText = `${systemPrompt}

Respond with ONLY valid JSON. Do not use tools, write files, or add commentary outside the JSON.

${userText}`;

  const run = await runCursorAgentPrompt(apiKey, {
    promptText,
    model: model || 'composer-2',
  });

  if (run.status !== 'FINISHED') {
    throw new Error(`Cursor Cloud Agent repair ended with status "${run.status}".`);
  }

  const text = (run.result || '').trim();
  if (!text) throw new Error('Cursor returned no repair text.');
  return parseGeneratedPayload(stripJsonFences(text));
}
