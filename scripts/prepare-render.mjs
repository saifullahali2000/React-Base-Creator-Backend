/**
 * Bundles monorepo assets into backend/ for Render (or standalone backend repo deploy).
 * Run in Render build when Root Directory is `backend` and repo is the full monorepo:
 *   node scripts/prepare-render.mjs && npm install && npm install --prefix preview-workspace
 */
import { cpSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = join(__dirname, '..');
const MONOREPO_ROOT = join(BACKEND_ROOT, '..');

function copyDir(name) {
  const src = join(MONOREPO_ROOT, name);
  const dest = join(BACKEND_ROOT, name);
  if (!existsSync(src)) {
    console.warn(`[prepare-render] Skip ${name} — not found at`, src);
    return false;
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
  console.log(`[prepare-render] Copied ${name} → backend/${name}`);
  return true;
}

const sampleOk = copyDir('Sample_Folder');
const previewOk = copyDir('preview-workspace');

if (!sampleOk && !previewOk) {
  console.warn(
    '[prepare-render] No parent folders copied. Standalone backend repo must commit Sample_Folder + preview-workspace, or connect the full monorepo on Render.',
  );
}
