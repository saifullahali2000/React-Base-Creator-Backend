import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { generateQuestion } from './services/claude.js';
import { generateQuestionGemini } from './services/gemini.js';
import { generateQuestionDeepseek, generateQuestionGrok, generateQuestionOpenrouter } from './services/openaiCompatible.js';
import { listOpenRouterModels } from './services/openrouter.js';
import { buildZip } from './services/zipBuilder.js';
import { writePreviewFiles, ensurePreviewRunning, getClientPreviewUrl, PREVIEW_PORT } from './services/previewRunner.js';
import { initDb, saveGeneration, getGeneration, updateGenerationPayload } from './services/db.js';
import { applySampleTemplates } from './services/sampleTemplateMerge.js';
import { applyPortalPostProcess } from './services/portalPostProcess.js';
import { v4 as uuidv4 } from 'uuid';
import { createProxyMiddleware } from 'http-proxy-middleware';

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
app.use(cors());
app.use(express.json({ limit: '50mb' }));

/** Proxy Vite preview on Render (not on Vercel serverless). */
if (!IS_VERCEL) {
  app.use(
    '/preview',
    createProxyMiddleware({
      target: `http://127.0.0.1:${PREVIEW_PORT}`,
      changeOrigin: true,
      ws: true,
    }),
  );
}

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
  } else if (provider === 'openrouter') {
    emit({ type: 'progress', step: 1, message: 'Calling OpenRouter to generate question...' });
    generated = await generateQuestionOpenrouter(genParams);
  } else {
    throw new Error(`Unknown aiProvider "${provider}". Use "claude", "gemini", "deepseek", "grok", or "openrouter".`);
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

app.post('/api/openrouter/models', async (req, res) => {
  try {
    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey : '';
    const models = await listOpenRouterModels(apiKey);
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
