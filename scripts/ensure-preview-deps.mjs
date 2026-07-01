import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PREVIEW_WORKSPACE = join(__dirname, '../../preview-workspace');

/** Install preview-workspace deps once so Vite validation/preview can symlink node_modules. */
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
