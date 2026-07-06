import { normalizePortalQuestionText } from './questionTextFramework.js';
import { syncTestCasesFromVitestFiles } from './testCaseSync.js';
import { syncReadmeFromQuestionText } from './portalPostProcess.js';
import {
  evaluateReadmeQuality,
  getReadmeValidateRetries,
  isReadmeValidationEnabled,
} from './readmeQuality.js';
import { repairReadmeQuestionText } from './readmeRepair.js';

function reNormalizeReadme(generated) {
  if (generated?.generatorOptions?.assessmentMode !== 'open_book') {
    syncTestCasesFromVitestFiles(generated);
  }
  normalizePortalQuestionText(generated);
  syncReadmeFromQuestionText(generated);
  return generated;
}

/**
 * Validate portal README; re-normalize and optionally LLM-repair until template checks pass.
 * @param {{ generated: object; emit?: (payload: object) => void; provider?: string; apiKey?: string; model?: string; functionality?: string }} params
 */
export async function runReadmeQualityLoop({
  generated,
  emit = () => {},
  provider,
  apiKey,
  model,
  functionality,
}) {
  if (!isReadmeValidationEnabled()) return generated;
  if (generated?.generatorOptions?.assessmentMode === 'open_book') return generated;

  const maxAttempts = getReadmeValidateRetries();
  let lastIssues = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    reNormalizeReadme(generated);
    const result = evaluateReadmeQuality(generated);

    if (result.ok) {
      if (attempt > 1) {
        emit({ type: 'progress', step: 2, message: 'README validated — portal template is clean.' });
      }
      return { generated, quality: result };
    }

    lastIssues = result.issues;

    if (attempt === maxAttempts) break;

    emit({
      type: 'progress',
      step: 2,
      message: `README template issues (${result.issues.length}) — repairing (${attempt + 1}/${maxAttempts})...`,
    });

    if (apiKey?.trim()) {
      await repairReadmeQuestionText({
        generated,
        issues: result.issues,
        provider,
        apiKey,
        model,
        functionality,
      });
    }
  }

  emit({
    type: 'progress',
    step: 2,
    message: `README quality warning: ${lastIssues[0] || 'template checks did not pass'}`,
  });

  return {
    generated,
    quality: { ok: false, issues: lastIssues, score: Math.max(0, 100 - lastIssues.length * 12) },
  };
}
