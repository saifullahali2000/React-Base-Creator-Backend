import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { PREVIEW_WORKSPACE } from '../src/paths.js';

/** Install preview-workspace deps once so Vite validation/preview can reuse node_modules. */
export function ensurePreviewWorkspaceDeps() {
  if (process.env.VERCEL === '1' && process.env.VERCEL_ENV) return;
  const nodeModules = join(PREVIEW_WORKSPACE, 'node_modules');
  if (existsSync(nodeModules)) return;
  const pkg = join(PREVIEW_WORKSPACE, 'package.json');
  if (!existsSync(pkg)) return;
  console.log('[preview] Installing preview-workspace dependencies (first run)...');
  execSync('npm install --no-audit --no-fund', {
    cwd: PREVIEW_WORKSPACE,
    stdio: 'inherit',
    shell: true,
  });
}
