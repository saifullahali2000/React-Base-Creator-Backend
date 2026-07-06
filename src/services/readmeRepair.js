import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseGeneratedPayload, stripJsonFences } from './generationParse.js';
import { QUESTION_TEXT_FRAMEWORK } from './questionTextFramework.js';
import { getPortalReadmeSystemBlock } from './readmeReference.js';
import { extractVitestCriticalHints } from './readmeQuality.js';
import { repairSolutionWithCursor } from './cursor.js';

const REPAIR_SYSTEM = `You rewrite ideCoding.question_text into the canonical NxtWave portal README format.

Return ONLY valid JSON:
{
  "ideCoding": {
    "question_text": "## Title — Application\\n\\n(full markdown)"
  }
}

Rules:
- Each section (Design Files, Set Up, Completion, Important Note, Additional, Test Contract, Resources) appears EXACTLY ONCE.
- Each section uses ONE <details> block only — never repeat the same section or duplicate <details> siblings.
- Include video block, Resources (Colors + Font-families swatches), and footer blockquote.
- Completion Instructions must be rich and grouped by feature.
- Important Note and Additional must list every test-critical string provided.
- Test Contract bullets must match ideCoding.test_cases display_text exactly.
- Do not change test_cases in your response.`;

function buildRepairUserText({ generated, issues, functionality }) {
  const testCases = generated?.ideCoding?.test_cases || [];
  const vitestHints = extractVitestCriticalHints(generated?.tests);
  const current = generated?.ideCoding?.question_text || '';

  return `Fix the portal README (question_text). Validation failed:

## Issues
${issues.map((i) => `- ${i}`).join('\n')}

## Application functionality
${(functionality || '').trim() || '(not provided)'}

## ideCoding.test_cases (Test Contract bullets must match exactly)
${JSON.stringify(testCases, null, 2)}

## Vitest-critical strings (must appear in Important Note or Additional)
${vitestHints.map((h) => `- ${h}`).join('\n') || '- (none detected)'}

## Current question_text (broken — rewrite completely)
${current.slice(0, 12000)}`;
}

async function repairWithClaude({ apiKey, model, system, userText }) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: model || 'claude-haiku-4-5-20251001',
    max_tokens: 16000,
    temperature: 0,
    system,
    messages: [{ role: 'user', content: userText }],
  });
  const text = response.content?.find((b) => b.type === 'text')?.text ?? '';
  return parseGeneratedPayload(stripJsonFences(text.trim()));
}

async function repairWithOpenAI({ apiKey, model, baseURL, system, userText }) {
  const client = new OpenAI({ apiKey, baseURL });
  const response = await client.chat.completions.create({
    model,
    max_tokens: 16000,
    temperature: 0,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userText },
    ],
  });
  const text = response.choices?.[0]?.message?.content ?? '';
  return parseGeneratedPayload(stripJsonFences(text.trim()));
}

async function repairWithGemini({ apiKey, model, system, userText }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const m = genAI.getGenerativeModel({
    model: model || 'gemini-2.0-flash',
    systemInstruction: system,
    generationConfig: { temperature: 0, maxOutputTokens: 16000, responseMimeType: 'application/json' },
  });
  const result = await m.generateContent(userText);
  const text = result.response?.text?.() ?? '';
  return parseGeneratedPayload(stripJsonFences(text.trim()));
}

/**
 * LLM pass to rewrite question_text when normalization + validation still fail.
 */
export async function repairReadmeQuestionText({
  generated,
  issues,
  provider,
  apiKey,
  model,
  functionality,
}) {
  const readmeTemplate = getPortalReadmeSystemBlock();
  const system = `${REPAIR_SYSTEM}\n\n${readmeTemplate}\n\n${QUESTION_TEXT_FRAMEWORK}`;
  const userText = buildRepairUserText({ generated, issues, functionality });

  const p = (provider || 'claude').toLowerCase();
  let patch;
  if (p === 'gemini') {
    patch = await repairWithGemini({ apiKey, model, system, userText });
  } else if (p === 'deepseek') {
    patch = await repairWithOpenAI({
      apiKey,
      model: model || 'deepseek-v4-flash',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      system,
      userText,
    });
  } else if (p === 'grok') {
    patch = await repairWithOpenAI({
      apiKey,
      model: model || 'grok-3-mini',
      baseURL: process.env.GROK_BASE_URL || 'https://api.x.ai/v1',
      system,
      userText,
    });
  } else if (p === 'openrouter') {
    patch = await repairWithOpenAI({
      apiKey,
      model: model || 'google/gemini-2.0-flash-001',
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      system,
      userText,
    });
  } else if (p === 'cursor') {
    patch = await repairSolutionWithCursor({
      apiKey,
      model: model || 'composer-2',
      systemPrompt: system,
      userText,
    });
  } else {
    patch = await repairWithClaude({ apiKey, model, system, userText });
  }

  if (patch?.ideCoding?.question_text && typeof patch.ideCoding.question_text === 'string') {
    generated.ideCoding.question_text = patch.ideCoding.question_text;
  }
  return generated;
}
