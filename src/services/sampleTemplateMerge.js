import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Repo root (React Base Creator), from backend/src/services */
const REPO_ROOT = join(__dirname, '../../..');

function resolveSampleSubdir(folderName) {
  const candidates = [
    join(REPO_ROOT, 'Sample_Folder', folderName),
    join(process.cwd(), 'Sample_Folder', folderName),
    join(__dirname, '../../../Sample_Folder', folderName),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return candidates[0];
}

export const SAMPLE_PREFILLED_DIR = resolveSampleSubdir('Ecommerce');
export const SAMPLE_SOLUTION_DIR = resolveSampleSubdir('Ecommerce_Solution');
export const SAMPLE_TESTS_DIR = resolveSampleSubdir('Ecommerce_Tests');

/** Must match portal / Sample_Folder (prefilled + solution). */
export const CANONICAL_ROOT_FILES = [
  '.nvmrc',
  '.prettierrc',
  'eslint.config.js',
  'index.html',
  'vite.config.js',
];

function tryReadUtf8(baseDir, relPath) {
  const p = join(baseDir, relPath);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

/**
 * Overwrite paths in filesMap with bytes from sampleDir (when file exists).
 * @returns number of files applied
 */
function applyCanonicalRootFiles(filesMap, sampleDir) {
  if (!existsSync(sampleDir)) return 0;
  let n = 0;
  for (const rel of CANONICAL_ROOT_FILES) {
    const txt = tryReadUtf8(sampleDir, rel);
    if (txt != null) {
      filesMap[rel] = txt;
      n++;
    }
  }
  return n;
}

/** e.g. src/__tests__/Foo.test.jsx */
function isGeneratedTestJsx(rel) {
  const p = rel.replace(/\\/g, '/');
  return /(^|\/)__tests__\/[^/]+\.(jsx|tsx)$/i.test(p);
}

function collectAllFiles(absRoot) {
  const out = {};
  if (!existsSync(absRoot)) return out;

  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else {
        const rel = relative(absRoot, full).replace(/\\/g, '/');
        out[rel] = readFileSync(full, 'utf8');
      }
    }
  };
  walk(absRoot);
  return out;
}

/**
 * Mutates `generated`: prefilled/solution get canonical root configs from Sample_Folder.
 * Tests tree comes from Sample_Folder/Ecommerce_Tests except __tests__/*.jsx|tsx, which stay from AI.
 */
export function applySampleTemplates(generated) {
  if (!generated) return generated;

  const mode = generated.generatorOptions?.assessmentMode || 'topin_base';

  if (mode === 'open_book') {
    if (!generated.solution || typeof generated.solution !== 'object') {
      generated.solution = {};
    }
    generated.prefilled = {};
    generated.tests = {};
    const sol = applyCanonicalRootFiles(generated.solution, SAMPLE_SOLUTION_DIR);
    if (sol === 0 && !existsSync(SAMPLE_SOLUTION_DIR)) {
      console.warn(
        '[sampleTemplateMerge] Sample_Folder/Ecommerce_Solution not found; open-book solution scaffold may be incomplete.'
      );
    }
    return generated;
  }

  if (!generated?.prefilled || typeof generated.prefilled !== 'object') return generated;
  if (!generated.solution || typeof generated.solution !== 'object') {
    generated.solution = {};
  }
  if (!generated.tests) generated.tests = {};

  const pf = applyCanonicalRootFiles(generated.prefilled, SAMPLE_PREFILLED_DIR);
  const sol = applyCanonicalRootFiles(generated.solution, SAMPLE_SOLUTION_DIR);

  if (existsSync(SAMPLE_TESTS_DIR)) {
    const diskTests = collectAllFiles(SAMPLE_TESTS_DIR);
    const merged = {};
    for (const [rel, content] of Object.entries(diskTests)) {
      if (isGeneratedTestJsx(rel)) continue;
      merged[rel] = content;
    }
    for (const [rel, content] of Object.entries(generated.tests)) {
      if (isGeneratedTestJsx(rel)) merged[rel] = content;
    }
    generated.tests = merged;
  }

  if (pf === 0 && sol === 0 && !existsSync(SAMPLE_TESTS_DIR)) {
    console.warn(
      '[sampleTemplateMerge] Sample_Folder (Ecommerce / Ecommerce_Solution / Ecommerce_Tests) not found; skipping template merge.'
    );
  }

  return generated;
}
