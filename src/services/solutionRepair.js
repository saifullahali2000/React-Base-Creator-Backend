import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseGeneratedPayload, stripJsonFences } from './generationParse.js';
import { repairSolutionWithCursor } from './cursor.js';

const REPAIR_SYSTEM = `You fix React 19 + Vite 7 solution code that failed an internal production build.

Return ONLY valid JSON (no markdown fences):
{
  "solution": {
    "src/path/to/changed/file.jsx": "full corrected file contents",
    ...
  }
}

Rules:
- Include ONLY files you changed (full file body per path).
- Fix import paths, missing exports, JSX syntax, react-router BrowserRouter wrapping, and hook rule violations.
- Do not change ideCoding, prefilled, or tests unless the build error explicitly references a test file.
- Keep the same app behavior and API contracts; only fix build/runtime-breaking issues.
- Prefer single-quoted strings inside JSX/JS to keep JSON valid.`;

function extractFilesFromBuildLog(solution, buildLog) {
  const paths = new Set();
  const log = String(buildLog || '');
  for (const m of log.matchAll(/(?:src\/[\w./-]+\.(?:jsx|js|tsx|ts|css))/gi)) {
    paths.add(m[0].replace(/\\/g, '/'));
  }
  if (!paths.size) {
    for (const k of Object.keys(solution || {})) {
      if (/^src\/App\.jsx$/i.test(k.replace(/\\/g, '/'))) paths.add(k.replace(/\\/g, '/'));
    }
  }
  if (!paths.size) paths.add('src/App.jsx');

  const subset = {};
  for (const rel of paths) {
    const key = Object.keys(solution || {}).find((k) => k.replace(/\\/g, '/') === rel);
    if (key && typeof solution[key] === 'string') subset[rel] = solution[key];
  }
  if (!Object.keys(subset).length && solution?.['src/App.jsx']) {
    subset['src/App.jsx'] = solution['src/App.jsx'];
  }
  return subset;
}

function buildRepairUserText({ functionality, errors, buildLog, solutionSubset }) {
  return `The generated React solution failed \`vite build\`. Fix the code so it compiles and renders.

## Original functionality
${(functionality || '').trim() || '(not provided)'}

## Build errors
${errors.map((e, i) => `### Error ${i + 1}\n${e}`).join('\n\n')}

## Build log (tail)
${String(buildLog || '').slice(-4000)}

## Files to fix (current contents)
${JSON.stringify({ solution: solutionSubset }, null, 2)}`;
}

async function repairWithClaude({ apiKey, model, userText }) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: model || 'claude-haiku-4-5-20251001',
    max_tokens: 16000,
    temperature: 0,
    system: REPAIR_SYSTEM,
    messages: [{ role: 'user', content: userText }],
  });
  const text = response.content?.find((b) => b.type === 'text')?.text ?? '';
  return parseGeneratedPayload(stripJsonFences(text.trim()));
}

async function repairWithOpenAI({ apiKey, model, baseURL, userText }) {
  const client = new OpenAI({ apiKey, baseURL });
  const response = await client.chat.completions.create({
    model,
    max_tokens: 16000,
    temperature: 0,
    messages: [
      { role: 'system', content: REPAIR_SYSTEM },
      { role: 'user', content: userText },
    ],
  });
  const text = response.choices?.[0]?.message?.content ?? '';
  return parseGeneratedPayload(stripJsonFences(text.trim()));
}

async function repairWithGemini({ apiKey, model, userText }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({
    model: model || 'gemini-2.0-flash',
    systemInstruction: REPAIR_SYSTEM,
    generationConfig: { temperature: 0, maxOutputTokens: 16000, responseMimeType: 'application/json' },
  });
  const result = await m.generateContent(userText);
  const text = result.response?.text?.() ?? '';
  return parseGeneratedPayload(stripJsonFences(text.trim()));
}

/**
 * Ask the active provider to patch solution files after a failed build.
 * @param {{ generated: object; errors: string[]; buildLog: string; provider: string; apiKey: string; model?: string; functionality: string }} params
 */
export async function repairGeneratedSolution({
  generated,
  errors,
  buildLog,
  provider,
  apiKey,
  model,
  functionality,
}) {
  const solution = generated?.solution || {};
  const subset = extractFilesFromBuildLog(solution, buildLog);
  const userText = buildRepairUserText({ functionality, errors, buildLog, solutionSubset: subset });

  const p = (provider || 'claude').toLowerCase();
  let patch;
  if (p === 'gemini') {
    patch = await repairWithGemini({ apiKey, model, userText });
  } else if (p === 'deepseek') {
    patch = await repairWithOpenAI({
      apiKey,
      model: model || 'deepseek-v4-flash',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      userText,
    });
  } else if (p === 'grok') {
    patch = await repairWithOpenAI({
      apiKey,
      model: model || 'grok-3-mini',
      baseURL: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
      userText,
    });
  } else if (p === 'openrouter') {
    patch = await repairWithOpenAI({
      apiKey,
      model: model || 'google/gemini-2.0-flash-001',
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      userText,
    });
  } else if (p === 'cursor') {
    patch = await repairSolutionWithCursor({
      apiKey,
      model: model || 'composer-2',
      systemPrompt: REPAIR_SYSTEM,
      userText,
    });
  } else {
    patch = await repairWithClaude({ apiKey, model, userText });
  }

  if (patch?.solution && typeof patch.solution === 'object') {
    generated.solution = { ...solution, ...patch.solution };
  }
  return generated;
}
