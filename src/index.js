import app from './app.js';
import { attachPreviewProxy } from './previewProxy.js';
import { ensurePreviewWorkspaceDeps } from '../scripts/ensure-preview-deps.mjs';

const IS_VERCEL = process.env.VERCEL === '1' && Boolean(process.env.VERCEL_ENV);

if (!IS_VERCEL) {
  ensurePreviewWorkspaceDeps();
  attachPreviewProxy(app);
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
