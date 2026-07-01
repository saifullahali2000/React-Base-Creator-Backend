import { randomBytes } from 'crypto';
import { collectTestCasesFromTestsMap } from './testCaseSync.js';

/** Fixed portal prefix — first 5 chars of every test enum base. */
export const TEST_ENUM_PREFIX = 'RJSCE';

const SUFFIX_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * 5 unique uppercase letters/digits (same rules as random.org strings:
 * upperalpha + digits, unique=on).
 */
export function generateTestEnumSuffix(length = 5) {
  const pool = SUFFIX_ALPHABET.split('');
  let suffix = '';
  for (let i = 0; i < length && pool.length > 0; i++) {
    const idx = randomBytes(1)[0] % pool.length;
    suffix += pool.splice(idx, 1)[0];
  }
  return suffix;
}

/** @returns {string} e.g. RJSCEB4YX4 */
export function buildTestEnumBase(suffix = generateTestEnumSuffix()) {
  return `${TEST_ENUM_PREFIX}${suffix}`;
}

export function isValidTestEnumBase(base) {
  return typeof base === 'string' && /^RJSCE[A-Z0-9]{5}$/.test(base);
}

/**
 * @param {Record<string, string> | undefined} tests
 * @param {Array<{ test_case_enum?: string }> | undefined} testCases
 */
export function findTestEnumBase(tests, testCases) {
  const bases = new Set();

  for (const row of collectTestCasesFromTestsMap(tests)) {
    const m = row.test_case_enum?.match(/^([A-Z0-9]+)_TEST_\d+$/i);
    if (m) bases.add(m[1].toUpperCase());
  }

  if (!bases.size && Array.isArray(testCases)) {
    for (const row of testCases) {
      const m = row?.test_case_enum?.match(/^([A-Z0-9]+)_TEST_\d+$/i);
      if (m) bases.add(m[1].toUpperCase());
    }
  }

  if (!bases.size && tests) {
    for (const content of Object.values(tests)) {
      if (typeof content !== 'string') continue;
      for (const m of content.matchAll(/:::([A-Z0-9]+)_TEST_(\d+):::/gi)) {
        bases.add(m[1].toUpperCase());
      }
    }
  }

  if (bases.size === 0) return null;
  if (bases.size > 1) {
    const sorted = [...bases].sort();
    return sorted[0];
  }
  return [...bases][0];
}

function replaceEnumBaseInText(text, oldBase, newBase) {
  if (typeof text !== 'string' || !oldBase || oldBase === newBase) return text;
  return text.split(oldBase).join(newBase);
}

/**
 * Rewrite Vitest titles + ideCoding.test_cases to use RJSCE + 5-char suffix.
 * @param {{ tests?: Record<string, string>; ideCoding?: { test_cases?: Array<{ test_case_enum?: string }> } }} generated
 */
export function enforceTestEnumConvention(generated) {
  if (!generated) return generated;
  if (generated.generatorOptions?.assessmentMode === 'open_book') return generated;
  if (Number(generated.generatorOptions?.testCaseCount) === 0) return generated;

  const testCases = generated.ideCoding?.test_cases;
  const oldBase = findTestEnumBase(generated.tests, testCases);
  if (!oldBase) return generated;
  if (isValidTestEnumBase(oldBase)) return generated;

  const newBase = buildTestEnumBase();

  if (generated.tests && typeof generated.tests === 'object') {
    for (const key of Object.keys(generated.tests)) {
      if (typeof generated.tests[key] === 'string') {
        generated.tests[key] = replaceEnumBaseInText(generated.tests[key], oldBase, newBase);
      }
    }
  }

  if (Array.isArray(testCases)) {
    for (const row of testCases) {
      if (typeof row?.test_case_enum === 'string') {
        row.test_case_enum = row.test_case_enum.replace(oldBase, newBase);
      }
    }
  }

  return generated;
}
