import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, writeFile, rm, symlink } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { buildRunnableSolutionProject } from './solutionStaticFix.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PREVIEW_WORKSPACE = join(__dirname, '../../../preview-workspace');
const IS_VERCEL = process.env.VERCEL === '1' && Boolean(process.env.VERCEL_ENV);

export function isSolutionValidationEnabled() {
  if (process.env.SOLUTION_VALIDATE_ENABLED === '0') return false;
  if (process.env.SOLUTION_VALIDATE_ENABLED === '1') return true;
  return !IS_VERCEL;
}

export function getSolutionValidateRetries() {
  const raw = process.env.SOLUTION_VALIDATE_RETRIES ?? '3';
  return Math.min(5, Math.max(1, parseInt(raw, 10) || 3));
}

function resolveValidateTimeoutMs() {
  const raw = process.env.SOLUTION_VALIDATE_TIMEOUT_MS;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n >= 15000 ? Math.min(n, 180000) : 90000;
}

async function writeProjectTree(rootDir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const full = join(rootDir, rel);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content, 'utf8');
  }
}

async function linkNodeModules(targetDir) {
  const src = join(PREVIEW_WORKSPACE, 'node_modules');
  const dest = join(targetDir, 'node_modules');
  if (!existsSync(src)) return false;
  try {
    await symlink(src, dest, 'junction');
    return true;
  } catch {
    try {
      await symlink(src, dest, 'dir');
      return true;
    } catch {
      return false;
    }
  }
}

function parseBuildErrors(log) {
  const lines = String(log || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const errors = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      /error during build/i.test(line) ||
      /\[vite\]/.test(line) ||
      /Failed to parse|Could not resolve|Cannot find module|Unexpected token|is not exported|SyntaxError/i.test(
        line,
      )
    ) {
      const chunk = lines.slice(i, Math.min(i + 4, lines.length)).join('\n');
      if (!errors.includes(chunk)) errors.push(chunk);
    }
  }

  if (!errors.length && /error/i.test(log)) {
    errors.push(lines.slice(-12).join('\n'));
  }

  return errors.slice(0, 12);
}

/**
 * Run Vite production build on merged solution + scaffold.
 * @param {Record<string, string>} solution
 * @returns {Promise<{ ok: boolean; errors: string[]; buildLog: string }>}
 */
export async function validateSolutionBuild(solution) {
  if (!isSolutionValidationEnabled()) {
    return { ok: true, errors: [], buildLog: '', skipped: true };
  }

  const projectFiles = buildRunnableSolutionProject(solution);
  const workDir = join(tmpdir(), `rqg-val-${randomUUID()}`);
  const timeout = resolveValidateTimeoutMs();

  try {
    await writeProjectTree(workDir, projectFiles);
    const linked = await linkNodeModules(workDir);

    if (!linked) {
      execSync('npm install --prefer-offline --no-audit --no-fund', {
        cwd: workDir,
        stdio: 'pipe',
        shell: true,
        timeout,
      });
    }

    let buildLog = '';
    try {
      buildLog = execSync('npx vite build', {
        cwd: workDir,
        stdio: 'pipe',
        shell: true,
        timeout,
        encoding: 'utf8',
      });
      return { ok: true, errors: [], buildLog };
    } catch (err) {
      const stdout = err.stdout?.toString?.() ?? '';
      const stderr = err.stderr?.toString?.() ?? '';
      buildLog = [stdout, stderr, err.message].filter(Boolean).join('\n');
      const errors = parseBuildErrors(buildLog);
      return { ok: false, errors: errors.length ? errors : [buildLog.slice(-2000)], buildLog };
    }
  } catch (err) {
    const msg = err.stderr?.toString?.() || err.message || String(err);
    return { ok: false, errors: [msg.slice(0, 2000)], buildLog: msg };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
