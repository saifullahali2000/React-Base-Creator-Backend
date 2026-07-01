/**
 * Copies repo Sample_Folder into backend/ for Vercel serverless bundles.
 * When Root Directory is `backend`, parent Sample_Folder is not in the function zip unless copied here.
 */
import { cpSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, '..');
const src = join(backendRoot, '..', 'Sample_Folder');
const dest = join(backendRoot, 'Sample_Folder');

if (!existsSync(src)) {
  console.warn('[prepare-vercel] Sample_Folder not found at', src);
  process.exit(0);
}

console.log('[prepare-vercel] Copying Sample_Folder into backend/');
cpSync(src, dest, { recursive: true, force: true });
console.log('[prepare-vercel] Done');
