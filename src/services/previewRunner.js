import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PREVIEW_PORT = 4000;

const IS_VERCEL = process.env.VERCEL === '1' && Boolean(process.env.VERCEL_ENV);
const PREVIEW_WORKSPACE = join(__dirname, '../../../preview-workspace');

let viteProcess = null;
let serverReady = false;

/** Vite `base` when preview is served behind Express `/preview` (Render, remote hosts). */
export function getPreviewBasePath() {
  const fromEnv = (process.env.PREVIEW_BASE_PATH || '').trim();
  if (fromEnv) return fromEnv.startsWith('/') ? fromEnv : `/${fromEnv}`;
  if ((process.env.RENDER_EXTERNAL_URL || '').trim()) return '/preview/';
  return '/';
}

/**
 * URL the browser should load for the live preview iframe.
 * - Local: http://localhost:4000
 * - Render: https://your-service.onrender.com/preview (via Express proxy)
 * - Override: PUBLIC_PREVIEW_URL
 */
export function getClientPreviewUrl() {
  const explicit = (process.env.PUBLIC_PREVIEW_URL || '').trim();
  if (explicit) return explicit.endsWith('/') ? explicit.slice(0, -1) : explicit;

  if (IS_VERCEL) return '';

  const renderUrl = (process.env.RENDER_EXTERNAL_URL || '').trim();
  if (renderUrl) {
    const base = renderUrl.endsWith('/') ? renderUrl.slice(0, -1) : renderUrl;
    return `${base}/preview`;
  }

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

  const previewBase = getPreviewBasePath();

  await new Promise((resolve) => {
    viteProcess = spawn(
      'npx',
      ['vite', '--port', String(PREVIEW_PORT), '--host', '--base', previewBase],
      {
        cwd: PREVIEW_WORKSPACE,
        shell: true,
        stdio: 'pipe',
        env: {
          ...process.env,
          PREVIEW_BASE_PATH: previewBase,
        },
      },
    );

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
