import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PREVIEW_PORT = 4000;

const IS_VERCEL = process.env.VERCEL === '1';
const PREVIEW_WORKSPACE = IS_VERCEL
  ? join(tmpdir(), 'rqg-preview-workspace')
  : join(__dirname, '../../../preview-workspace');

let viteProcess = null;
let serverReady = false;

/**
 * URL the browser should load for the live preview iframe.
 * Set PUBLIC_PREVIEW_URL when the API runs remotely and preview is hosted elsewhere.
 */
export function getClientPreviewUrl() {
  const u = (process.env.PUBLIC_PREVIEW_URL || '').trim();
  if (u) return u.endsWith('/') ? u.slice(0, -1) : u;
  if (IS_VERCEL) return '';
  return `http://localhost:${PREVIEW_PORT}`;
}

export async function writePreviewFiles(solutionFiles) {
  if (IS_VERCEL) return;
  for (const [filePath, content] of Object.entries(solutionFiles)) {
    const fullPath = join(PREVIEW_WORKSPACE, filePath);
    const dir = dirname(fullPath);
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, content, 'utf8');
  }
}

export async function ensurePreviewRunning() {
  if (IS_VERCEL) return;
  if (serverReady && viteProcess && !viteProcess.killed) return;

  const nodeModules = join(PREVIEW_WORKSPACE, 'node_modules');
  if (!existsSync(nodeModules)) {
    console.log('[preview] Installing workspace deps (first run)...');
    execSync('npm install', { cwd: PREVIEW_WORKSPACE, stdio: 'inherit', shell: true });
    console.log('[preview] Done.');
  }

  if (viteProcess && !viteProcess.killed) {
    viteProcess.kill();
    viteProcess = null;
    serverReady = false;
  }

  await new Promise((resolve) => {
    viteProcess = spawn('npx', ['vite', '--port', String(PREVIEW_PORT), '--host'], {
      cwd: PREVIEW_WORKSPACE,
      shell: true,
      stdio: 'pipe',
    });

    const onData = (data) => {
      const str = data.toString();
      if (str.includes(String(PREVIEW_PORT)) || str.includes('Local:') || str.includes('ready')) {
        serverReady = true;
        resolve();
      }
    };

    viteProcess.stdout.on('data', onData);
    viteProcess.stderr.on('data', onData);
    viteProcess.on('error', (err) => {
      console.error('[preview] Vite error:', err.message);
      resolve();
    });

    setTimeout(() => {
      serverReady = true;
      resolve();
    }, 6000);
  });
}
