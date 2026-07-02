import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** `backend/` directory (monorepo subfolder or standalone API repo root). */
export const BACKEND_ROOT = join(__dirname, '..');

function isPreviewWorkspace(dir) {
  return Boolean(dir) && existsSync(join(dir, 'package.json'));
}

function firstExisting(candidates, fallback) {
  for (const p of candidates) {
    if (p && existsSync(p)) return p;
  }
  return fallback ?? candidates[0];
}

/** Vite preview + validation workspace (must include package.json). */
export function resolvePreviewWorkspace() {
  const candidates = [
    join(process.cwd(), 'preview-workspace'),
    join(BACKEND_ROOT, 'preview-workspace'),
    join(BACKEND_ROOT, '..', 'preview-workspace'),
  ];
  for (const p of candidates) {
    if (isPreviewWorkspace(p)) return p;
  }
  return candidates[candidates.length - 1];
}

/** Sample_Folder root (portal templates). */
export function resolveSampleFolderRoot() {
  return firstExisting([
    join(process.cwd(), 'Sample_Folder'),
    join(BACKEND_ROOT, 'Sample_Folder'),
    join(BACKEND_ROOT, '..', 'Sample_Folder'),
  ]);
}

export const PREVIEW_WORKSPACE = resolvePreviewWorkspace();
export const SAMPLE_FOLDER_ROOT = resolveSampleFolderRoot();

export function logDeployAssetStatus() {
  const previewPkg = join(PREVIEW_WORKSPACE, 'package.json');
  const sampleOk = existsSync(join(SAMPLE_FOLDER_ROOT, 'Ecommerce'));
  const previewOk = existsSync(previewPkg);
  const previewDeps = existsSync(join(PREVIEW_WORKSPACE, 'node_modules', 'vite'));

  if (!sampleOk || !previewOk) {
    console.warn(
      '[deploy] Missing assets for full Generate pipeline:',
      !sampleOk ? 'Sample_Folder' : '',
      !previewOk ? 'preview-workspace' : '',
      '— connect the full monorepo on Render or run: node scripts/prepare-render.mjs',
    );
  } else if (!previewDeps) {
    console.warn(
      '[deploy] preview-workspace/node_modules missing — first generate may run npm install (slow).',
    );
  }
}
