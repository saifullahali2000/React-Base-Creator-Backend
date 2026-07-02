import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { generateQuestion } from './services/claude.js';
import { generateQuestionGemini } from './services/gemini.js';
import { generateQuestionDeepseek, generateQuestionGrok, generateQuestionOpenrouter } from './services/openaiCompatible.js';
import { listOpenRouterModels } from './services/openrouter.js';
import { listCursorModels, generateQuestionCursor } from './services/cursor.js';
import { buildZip } from './services/zipBuilder.js';
import { writePreviewFiles, ensurePreviewRunning, getClientPreviewUrl, PREVIEW_PORT } from './services/previewRunner.js';
import { initDb, saveGeneration, getGeneration, updateGenerationPayload } from './services/db.js';
import { applySampleTemplates } from './services/sampleTemplateMerge.js';
import { applyPortalPostProcess } from './services/portalPostProcess.js';
import { applyStaticSolutionFixes } from './services/solutionStaticFix.js';
import {
  validateSolutionBuild,
  getSolutionValidateRetries,
  isSolutionValidationEnabled,
} from './services/solutionValidator.js';
import { repairGeneratedSolution } from './services/solutionRepair.js';
import { estimateGenerationInputTokens } from './services/tokenEstimate.js';
import { v4 as uuidv4 } from 'uuid';

const IS_VERCEL = process.env.VERCEL === '1' && Boolean(process.env.VERCEL_ENV);

/** Legacy DB rows used "topic_base"; API returns "topin_base" for the full IDE flow. */
function normalizeAssessmentModeForApi(m) {
  if (m === 'open_book') return 'open_book';
  if (m === 'topic_base') return 'topin_base';
  return 'topin_base';
}

/** Multipart fields can be string or string[]; normalize so Open book is never dropped to topin_base. */
function readAssessmentModeFromBody(body) {
  let v = body?.assessmentMode;
  if (Array.isArray(v)) v = v.length ? v[v.length - 1] : undefined;
  if (typeof v !== 'string') return 'topin_base';
  const t = v.trim().toLowerCase();
  return t === 'open_book' ? 'open_book' : 'topin_base';
}

const app = express();

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const FRONTEND_DEV_URL = (process.env.FRONTEND_DEV_URL || 'http://localhost:5173').replace(/\/+$/, '');
const LOCAL_PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;

/** API-only server — avoid "Cannot GET /" confusion when users open :3001 in the browser. */
app.get('/', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>React Base Creator — API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2.5rem auto; padding: 0 1rem; line-height: 1.55; color: #1a1a1a; }
    h1 { font-size: 1.35rem; margin-bottom: 0.25rem; }
    p { margin: 0.75rem 0; }
    code { background: #f4f4f5; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.9em; }
    ul { padding-left: 1.25rem; }
    a { color: #6d28d9; }
    .note { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 0.85rem 1rem; margin-top: 1rem; }
  </style>
</head>
<body>
  <h1>React Base Creator — backend API</h1>
  <p>This URL is the <strong>API server</strong>, not the generated React app and not the Question Generator UI.</p>
  <div class="note">
    <p><strong>Open the app here:</strong> <a href="${FRONTEND_DEV_URL}">${FRONTEND_DEV_URL}</a></p>
    <p>After you click <em>Generate</em>, open the <strong>Preview</strong> tab in that app to see the LLM-built solution (in-browser Sandpack preview).</p>
  </div>
  <p>Other local URLs:</p>
  <ul>
    <li><code>${FRONTEND_DEV_URL}</code> — Question Generator UI (use this)</li>
    <li><code>http://localhost:3001</code> — this API (<code>/api/generate</code>, <code>/api/health</code>, …)</li>
    <li><code>${LOCAL_PREVIEW_URL}</code> — optional Vite preview workspace (when backend hosts preview)</li>
  </ul>
  <p>API health: <a href="/api/health">/api/health</a></p>
</body>
</html>`);
});

/** Chrome DevTools probes this path; return empty success to avoid console noise. */
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.status(204).end();
});

const PROXY_HEADER_BLOCK = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'accept-encoding',
]);

/** Forward app API calls from Sandpack preview (avoids browser CORS). Must run before express.json(). */
async function handlePreviewProxy(req, res) {
  try {
    const target = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!target) return res.status(400).json({ error: 'Missing url query parameter' });

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return res.status(400).json({ error: 'Invalid url' });
    }
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return res.status(400).json({ error: 'Only http(s) URLs are allowed' });
    }

    const forwardHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      const lower = key.toLowerCase();
      if (PROXY_HEADER_BLOCK.has(lower) || lower.startsWith('x-forwarded')) continue;
      if (Array.isArray(value)) forwardHeaders[key] = value.join(', ');
      else if (value) forwardHeaders[key] = value;
    }

    const method = (req.method || 'GET').toUpperCase();
    const hasBody = method !== 'GET' && method !== 'HEAD';
    const body =
      hasBody && req.body && req.body.length
        ? req.body
        : hasBody && typeof req.body === 'string'
          ? req.body
          : undefined;

    const upstream = await fetch(target, {
      method,
      headers: forwardHeaders,
      body,
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (['transfer-encoding', 'connection', 'content-encoding'].includes(lower)) return;
      res.setHeader(key, value);
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    res.status(502).json({ error: err.message || 'Proxy request failed' });
  }
}

app.all('/api/preview-proxy', express.raw({ type: '*/*', limit: '15mb' }), handlePreviewProxy);

app.use(express.json({ limit: '50mb' }));

initDb();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 24 },
});

const PROVIDER_LABELS = {
  claude: 'Anthropic',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
  grok: 'Grok',
  cursor: 'Cursor',
  openrouter: 'OpenRouter',
};

function apiKeyRequiredMessage(provider) {
  const label = PROVIDER_LABELS[provider] || 'API';
  return `${label} API key is required`;
}

/**
 * Core generate flow. `emit` receives the same JSON objects as SSE `data:` payloads.
 */
async function runGeneratePipeline(req, emit) {
  const {
    functionality,
    testCaseCount,
    apiKey,
    model,
    appApiBaseUrls,
    appApiEndpoints,
    aiProvider,
  } = req.body;
  const provider = (typeof aiProvider === 'string' ? aiProvider : 'claude').toLowerCase();

  const assessmentMode = readAssessmentModeFromBody(req.body);

  const screenshotImages = (req.files || []).map((f) => ({
    base64: f.buffer.toString('base64'),
    mediaType: f.mimetype,
  }));

  if (!apiKey?.trim()) {
    throw new Error(apiKeyRequiredMessage(provider));
  }
  if (!functionality?.trim()) throw new Error('Application functionality description is required');

  const rawTc = parseInt(testCaseCount, 10);
  const testCaseCountNum =
    assessmentMode === 'open_book'
      ? 0
      : Number.isFinite(rawTc) && rawTc >= 0
        ? Math.min(100, rawTc)
        : 10;

  const genParams = {
    apiKey: apiKey.trim(),
    model,
    functionality: functionality.trim(),
    testCaseCount: testCaseCountNum,
    screenshotImages,
    appApiBaseUrls: typeof appApiBaseUrls === 'string' ? appApiBaseUrls : '',
    appApiEndpoints: typeof appApiEndpoints === 'string' ? appApiEndpoints : '',
    assessmentMode,
  };

  let generated;
  if (provider === 'gemini') {
    emit({ type: 'progress', step: 1, message: 'Calling Google Gemini to generate question...' });
    generated = await generateQuestionGemini(genParams);
  } else if (provider === 'claude') {
    emit({ type: 'progress', step: 1, message: 'Calling Claude AI to generate question...' });
    generated = await generateQuestion(genParams);
  } else if (provider === 'deepseek') {
    emit({ type: 'progress', step: 1, message: 'Calling DeepSeek to generate question...' });
    generated = await generateQuestionDeepseek(genParams);
  } else if (provider === 'grok') {
    emit({ type: 'progress', step: 1, message: 'Calling xAI Grok to generate question...' });
    generated = await generateQuestionGrok(genParams);
  } else if (provider === 'cursor') {
    emit({ type: 'progress', step: 1, message: 'Calling Cursor Cloud Agent to generate question...' });
    generated = await generateQuestionCursor(genParams);
  } else if (provider === 'openrouter') {
    emit({ type: 'progress', step: 1, message: 'Calling OpenRouter to generate question...' });
    generated = await generateQuestionOpenrouter(genParams);
  } else {
    throw new Error(`Unknown aiProvider "${provider}". Use "claude", "gemini", "deepseek", "grok", "cursor", or "openrouter".`);
  }

  generated.generatorOptions = {
    assessmentMode,
    testCaseCount: testCaseCountNum,
  };
  if (assessmentMode === 'open_book') {
    generated.prefilled = {};
    generated.tests = {};
  }

  applySampleTemplates(generated);
  applyPortalPostProcess(generated);
  applyStaticSolutionFixes(generated);

  if (isSolutionValidationEnabled()) {
    const validateAttempts = getSolutionValidateRetries();
    let lastValidationErrors = [];
    let lastValidationLog = '';
    for (let attempt = 1; attempt <= validateAttempts; attempt++) {
      emit({
        type: 'progress',
        step: 2,
        message:
          attempt === 1
            ? 'Validating solution (Vite build)...'
            : `Repairing build errors (attempt ${attempt}/${validateAttempts})...`,
      });

      if (attempt > 1) {
        generated = await repairGeneratedSolution({
          generated,
          errors: lastValidationErrors,
          buildLog: lastValidationLog,
          provider,
          apiKey: genParams.apiKey,
          model: genParams.model,
          functionality: genParams.functionality,
        });
        applySampleTemplates(generated);
        applyPortalPostProcess(generated);
        applyStaticSolutionFixes(generated);
      }

      const validation = await validateSolutionBuild(generated.solution);
      if (validation.ok) {
        if (attempt > 1) {
          emit({
            type: 'progress',
            step: 2,
            message: 'Solution validated — build succeeded.',
          });
        }
        break;
      }

      lastValidationErrors = validation.errors;
      lastValidationLog = validation.buildLog;

      if (attempt === validateAttempts) {
        emit({
          type: 'progress',
          step: 2,
          message:
            'Build still has issues after auto-repair; delivering best effort. Check preview devtools.',
        });
      }
    }
  }

  emit({ type: 'progress', step: 2, message: 'Writing preview files...' });

  await writePreviewFiles(generated.solution);

  emit({ type: 'progress', step: 3, message: 'Starting preview server...' });

  await ensurePreviewRunning();

  const sessionId = uuidv4();
  saveGeneration(sessionId, generated, assessmentMode);

  const previewUrl = getClientPreviewUrl();

  emit({
    type: 'done',
    sessionId,
    projectName: generated.projectName,
    assessmentMode,
    previewUrl,
    files: {
      prefilled: generated.prefilled,
      solution: generated.solution,
      tests: generated.tests,
      ideCoding: generated.ideCoding,
    },
  });
}

app.post('/api/generate', upload.array('screenshots', 24), async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  // SSE comment lines keep some proxies from treating the connection as idle during long model calls (504).
  res.write(': stream-open\n\n');

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  try {
    await runGeneratePipeline(req, send);
  } catch (err) {
    send({ type: 'error', message: err.message });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

async function probePreviewUrl(previewUrl, timeoutMs = 5000) {
  try {
    const probe = await fetch(previewUrl, { signal: AbortSignal.timeout(timeoutMs) });
    return probe.ok;
  } catch {
    return false;
  }
}

app.get('/api/preview/status', async (_req, res) => {
  const previewUrl = getClientPreviewUrl();
  if (!previewUrl) {
    return res.json({ running: false, url: '', reason: 'preview_disabled' });
  }
  const running = await probePreviewUrl(previewUrl, 5000);
  res.json({ running, url: previewUrl, ...(running ? {} : { reason: 'unreachable' }) });
});

/** Start Vite preview if idle (e.g. after page refresh). Poll this before falling back to Sandpack. */
app.post('/api/preview/ensure', async (_req, res) => {
  const previewUrl = getClientPreviewUrl();
  if (!previewUrl || IS_VERCEL) {
    return res.json({ running: false, url: previewUrl || '', reason: 'preview_disabled' });
  }
  try {
    await ensurePreviewRunning();
    const running = await probePreviewUrl(previewUrl, 10000);
    res.json({ running, url: previewUrl, ...(running ? {} : { reason: 'starting' }) });
  } catch (err) {
    res.status(500).json({ running: false, url: previewUrl, error: err.message });
  }
});

app.post('/api/estimate-tokens', (req, res) => {
  try {
    const body = req.body ?? {};
    const assessmentMode =
      body.assessmentMode === 'open_book' ? 'open_book' : 'topin_base';
    const estimate = estimateGenerationInputTokens({
      assessmentMode,
      testCaseCount: body.testCaseCount,
      functionality: typeof body.functionality === 'string' ? body.functionality : '',
      appApiBaseUrls: typeof body.appApiBaseUrls === 'string' ? body.appApiBaseUrls : '',
      appApiEndpoints: typeof body.appApiEndpoints === 'string' ? body.appApiEndpoints : '',
      hasScreenshots: Boolean(body.hasScreenshots),
      screenshots: Array.isArray(body.screenshots) ? body.screenshots : [],
    });
    res.json(estimate);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/openrouter/models', async (req, res) => {
  try {
    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey : '';
    const models = await listOpenRouterModels(apiKey);
    res.json({ models });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cursor/models', async (req, res) => {
  try {
    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey : '';
    if (!apiKey.trim()) {
      return res.status(400).json({ error: 'Cursor API key is required to load models.' });
    }
    const models = await listCursorModels(apiKey);
    res.json({ models });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Save one file (or ideCoding JSON) into the stored generation and optionally sync solution to preview disk.
 * POST or PATCH (same body). Some proxies strip PATCH; POST is the default from the app.
 * Body: { root: 'prefilled'|'solution'|'tests'|'ideCoding', path?: 'src/App.jsx', content: string }
 * For ideCoding, `content` must be a JSON string of the full ideCoding object.
 */
async function handleGenerationFileSave(req, res) {
  try {
    const row = getGeneration(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });

    const { root, path: relPath, content } = req.body ?? {};
    if (typeof root !== 'string' || !['prefilled', 'solution', 'tests', 'ideCoding'].includes(root)) {
      return res.status(400).json({ error: 'Invalid or missing root' });
    }
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'content must be a string' });
    }

    const generated = structuredClone(row.generated);

    if (root === 'ideCoding') {
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        return res.status(400).json({ error: `Invalid ideCoding JSON: ${e.message}` });
      }
      generated.ideCoding = parsed;
    } else {
      if (typeof relPath !== 'string' || !relPath.trim()) {
        return res.status(400).json({ error: 'path is required for prefilled, solution, and tests' });
      }
      const key = relPath.replace(/\\/g, '/');
      if (!generated[root] || typeof generated[root] !== 'object') {
        generated[root] = {};
      }
      generated[root][key] = content;
      if (root === 'solution') {
        await writePreviewFiles({ [key]: content });
      }
    }

    const ok = updateGenerationPayload(req.params.id, generated);
    if (!ok) return res.status(500).json({ error: 'Failed to update generation' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.patch('/api/generations/:id/file', handleGenerationFileSave);
app.post('/api/generations/:id/file', handleGenerationFileSave);

app.post('/api/generations/:id/restore', async (req, res) => {
  const row = getGeneration(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const g = row.generated;
  try {
    applySampleTemplates(g);
    applyPortalPostProcess(g);
    await writePreviewFiles(g.solution);
    await ensurePreviewRunning();
    const assessmentMode = normalizeAssessmentModeForApi(g.generatorOptions?.assessmentMode);
    const previewUrl = getClientPreviewUrl();
    res.json({
      sessionId: row.id,
      projectName: g.projectName,
      assessmentMode,
      previewUrl,
      files: {
        prefilled: g.prefilled,
        solution: g.solution,
        tests: g.tests,
        ideCoding: g.ideCoding,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/download/:sessionId', (req, res) => {
  const row = getGeneration(req.params.sessionId);
  if (!row) return res.status(404).json({ error: 'Session not found' });

  const generated = structuredClone(row.generated);
  applySampleTemplates(generated);
  applyPortalPostProcess(generated);
  const filename = `${generated.projectName}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  buildZip(generated, res).catch((err) => console.error('ZIP error:', err));
});

export default app;
