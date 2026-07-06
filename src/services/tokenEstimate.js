import {
  SYSTEM_PROMPT,
  SYSTEM_PROMPT_OPEN_BOOK,
  buildUserRequestText,
  buildOpenBookUserRequestText,
  getSystemPromptStats,
} from './generationPrompt.js';

/** Rough input-token estimate (~4 chars/token for English prose/code). */
export function estimateTextTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.ceil(trimmed.length / 4);
}

/** Vision input estimate (Claude-style: min 512, else area / 750). */
export function estimateImageTokens(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return 1024;
  }
  if (w <= 512 && h <= 512) return 512;
  return Math.ceil((w * h) / 750);
}

function normalizeTestCaseCount(testCaseCount, assessmentMode) {
  if (assessmentMode === 'open_book') return 0;
  const n = Number(testCaseCount);
  if (!Number.isFinite(n) || n < 0) return 10;
  return Math.min(100, Math.floor(n));
}

/**
 * Estimate prompt input tokens before calling the model.
 * Breaks down backend-fixed text vs user-entered form fields.
 */
export function estimateGenerationInputTokens({
  assessmentMode = 'topin_base',
  testCaseCount = 10,
  functionality = '',
  appApiBaseUrls = '',
  appApiEndpoints = '',
  hasScreenshots = false,
  screenshots = [],
}) {
  const isOpenBook = assessmentMode === 'open_book';
  const systemPrompt = isOpenBook ? SYSTEM_PROMPT_OPEN_BOOK : SYSTEM_PROMPT;
  const count = normalizeTestCaseCount(testCaseCount, assessmentMode);

  const functionalityTrimmed = String(functionality || '').trim();
  const basesTrimmed = String(appApiBaseUrls || '').trim();
  const endpointsTrimmed = String(appApiEndpoints || '').trim();

  const userRequestText = isOpenBook
    ? buildOpenBookUserRequestText({
        functionality: functionalityTrimmed,
        appApiBaseUrls: basesTrimmed,
        appApiEndpoints: endpointsTrimmed,
        hasScreenshots: hasScreenshots || screenshots.length > 0,
      })
    : buildUserRequestText({
        testCaseCount: count,
        functionality: functionalityTrimmed,
        appApiBaseUrls: basesTrimmed,
        appApiEndpoints: endpointsTrimmed,
        hasScreenshots: hasScreenshots || screenshots.length > 0,
      });

  const systemPromptTokens = estimateTextTokens(systemPrompt);
  const userRequestTokens = estimateTextTokens(userRequestText);
  const promptStats = getSystemPromptStats(isOpenBook ? 'open_book' : 'topin_base');
  const readmeTemplateTokens = estimateTextTokens(promptStats.readmeBlock);

  const frontendFunctionality = estimateTextTokens(functionalityTrimmed);
  const frontendApiBases = estimateTextTokens(basesTrimmed);
  const frontendApiEndpoints = estimateTextTokens(endpointsTrimmed);
  const frontendSubtotal = frontendFunctionality + frontendApiBases + frontendApiEndpoints;

  const promptWrapperTokens = Math.max(0, userRequestTokens - frontendSubtotal);

  const perImage = (Array.isArray(screenshots) ? screenshots : []).map((shot) =>
    estimateImageTokens(shot?.width, shot?.height)
  );
  const imageTokens = perImage.reduce((sum, n) => sum + n, 0);

  const totalInputTokens = systemPromptTokens + userRequestTokens + imageTokens;

  return {
    method: 'chars/4 text + vision area/750 images (approximate)',
    assessmentMode: isOpenBook ? 'open_book' : 'topin_base',
    testCaseCount: count,
    backend: {
      systemPrompt: systemPromptTokens,
      readmeTemplate: readmeTemplateTokens,
      systemPromptWithoutReadme: Math.max(0, systemPromptTokens - readmeTemplateTokens),
      promptWrapper: promptWrapperTokens,
      userRequestTotal: userRequestTokens,
      subtotal: systemPromptTokens + userRequestTokens,
    },
    promptMeta: promptStats,
    frontend: {
      functionality: frontendFunctionality,
      appApiBaseUrls: frontendApiBases,
      appApiEndpoints: frontendApiEndpoints,
      subtotal: frontendSubtotal,
    },
    images: {
      count: perImage.length,
      perImage,
      subtotal: imageTokens,
    },
    totalInputTokens,
  };
}
