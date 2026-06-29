/**
 * Portal / NxtWave fixes applied after AI output + Sample_Folder merge:
 * - ideCoding: replace prompt placeholder UUIDs with real ones (matches IDE_BASED_CODING/*.json name)
 * - Prefilled: inject IDE preview address-bar bridge in every .html file's <head>
 * - Solution: add readme.md with ideCoding.question_text (does not remove other files)
 * - Tests: vite.config.js reporters include 'verbose' before CCBPVitestReporter; if generatorOptions.testCaseCount is 0, strip __tests__ files, clear ideCoding.test_cases, and set passWithNoTests in Vitest config
 */

import { v4 as uuidv4 } from 'uuid';

const IDE_BRIDGE_SCRIPT =
  '<script src="https://nxtwave-assessments-backend-nxtwave-media-static.s3.ap-south-1.amazonaws.com/external-scripts/ide-coding/ide_react_preview_adress_bar_bridge.js"></script>';

const BRIDGE_MARKER = 'ide_react_preview_adress_bar_bridge.js';

/**
 * @param {string} html
 * @returns {string}
 */
export function injectIdeBridgeScriptInHtml(html) {
  if (html == null || typeof html !== 'string') return html;
  if (html.includes(BRIDGE_MARKER)) return html;

  const lower = html.toLowerCase();
  const headClose = lower.lastIndexOf('</head>');
  if (headClose !== -1) {
    return `${html.slice(0, headClose)}\n    ${IDE_BRIDGE_SCRIPT}\n  ${html.slice(headClose)}`;
  }

  const m = html.match(/<head[^>]*>/i);
  if (m && m.index !== undefined) {
    const ins = m.index + m[0].length;
    return `${html.slice(0, ins)}\n    ${IDE_BRIDGE_SCRIPT}${html.slice(ins)}`;
  }

  return html;
}

/**
 * @param {string} src vite.config.js text
 * @returns {string}
 */
export function patchVitestReportersInViteConfig(src) {
  if (src == null || typeof src !== 'string') return src;
  if (/reporters:\s*\[\s*['"]verbose['"]\s*,\s*new\s+CCBPVitestReporter\s*\(\)\s*\]/.test(src)) return src;
  return src.replace(
    /reporters:\s*\[\s*new\s+CCBPVitestReporter\s*\(\)\s*\]/g,
    "reporters: ['verbose', new CCBPVitestReporter()]",
  );
}

/** When there are no test files, Vitest should exit successfully. */
export function ensurePassWithNoTestsInViteConfig(src) {
  if (src == null || typeof src !== 'string') return src;
  if (/passWithNoTests\s*:\s*true/.test(src)) return src;
  return src.replace(/\btest:\s*\{/, 'test: {\n    passWithNoTests: true,');
}

/**
 * @param {Record<string, string> | undefined} tests
 */
export function stripVitestFilesFromTestsMap(tests) {
  if (!tests || typeof tests !== 'object') return;
  for (const k of Object.keys(tests)) {
    const p = k.replace(/\\/g, '/');
    if (/\/__tests__\//.test(p) && /\.(jsx|tsx|js|ts)$/i.test(p)) {
      delete tests[k];
    }
  }
}

function isZeroTestCaseRequest(generated) {
  return Number(generated?.generatorOptions?.testCaseCount) === 0;
}

const GENERIC_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Prompt literals / malformed — replace so zip filename matches JSON */
function needsNewQuestionId(id) {
  if (id == null || typeof id !== 'string') return true;
  const s = id.trim();
  if (/^x{8}-x{4}-x{4}-x{4}-x{12}$/i.test(s)) return true;
  return !GENERIC_UUID.test(s);
}

function needsNewIdeSessionId(id) {
  if (id == null || typeof id !== 'string') return true;
  const s = id.trim();
  if (/^y{8}-y{4}-y{4}-y{4}-y{12}$/i.test(s)) return true;
  return !GENERIC_UUID.test(s);
}

/**
 * Ensures ideCoding.question_id and ide_session_id are real UUIDs so the zip
 * JSON body and `IDE_BASED_CODING/<question_id>.json` stay in sync.
 * @param {{ ideCoding?: { question_id?: string; ide_session_id?: string } }} generated
 */
export function ensureIdeCodingFreshUuids(generated) {
  if (!generated?.ideCoding || typeof generated.ideCoding !== 'object') return generated;
  const ic = generated.ideCoding;
  if (needsNewQuestionId(ic.question_id)) {
    ic.question_id = uuidv4();
  }
  if (needsNewIdeSessionId(ic.ide_session_id)) {
    ic.ide_session_id = uuidv4();
  }
  return generated;
}

/**
 * @param {{ prefilled?: Record<string, string>; solution?: Record<string, string>; tests?: Record<string, string>; ideCoding?: { question_text?: string; short_text?: string } }} generated
 */
export function applyPortalPostProcess(generated) {
  if (!generated) return generated;

  if (!generated.solution || typeof generated.solution !== 'object') {
    generated.solution = {};
  }

  if (generated.generatorOptions?.assessmentMode === 'open_book') {
    generated.prefilled = {};
    generated.tests = {};
    if (generated.ideCoding && typeof generated.ideCoding === 'object') {
      generated.ideCoding.test_cases = [];
    }
  }

  ensureIdeCodingFreshUuids(generated);

  if (generated.prefilled && typeof generated.prefilled === 'object') {
    for (const [rel, content] of Object.entries(generated.prefilled)) {
      if (!/\.html?$/i.test(rel) || typeof content !== 'string') continue;
      generated.prefilled[rel] = injectIdeBridgeScriptInHtml(content);
    }
  }

  if (generated.ideCoding && typeof generated.ideCoding === 'object') {
    const qt =
      typeof generated.ideCoding.question_text === 'string' && generated.ideCoding.question_text.trim()
        ? generated.ideCoding.question_text.trim()
        : typeof generated.ideCoding.short_text === 'string' && generated.ideCoding.short_text.trim()
          ? generated.ideCoding.short_text.trim()
          : 'Question text unavailable.';

    generated.solution['readme.md'] = `${qt}\n`;
  }

  if (generated.tests && typeof generated.tests === 'object') {
    const viteKey = Object.keys(generated.tests).find((k) => k.replace(/\\/g, '/') === 'vite.config.js');
    if (viteKey && typeof generated.tests[viteKey] === 'string') {
      generated.tests[viteKey] = patchVitestReportersInViteConfig(generated.tests[viteKey]);
    }
  }

  if (isZeroTestCaseRequest(generated)) {
    if (generated.ideCoding && typeof generated.ideCoding === 'object') {
      generated.ideCoding.test_cases = [];
    }
    if (generated.tests && typeof generated.tests === 'object') {
      stripVitestFilesFromTestsMap(generated.tests);
      const viteKey = Object.keys(generated.tests).find((k) => k.replace(/\\/g, '/') === 'vite.config.js');
      if (viteKey && typeof generated.tests[viteKey] === 'string') {
        generated.tests[viteKey] = ensurePassWithNoTestsInViteConfig(generated.tests[viteKey]);
      }
    }
  }

  return generated;
}
