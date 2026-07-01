import { createProxyMiddleware } from 'http-proxy-middleware';
import { PREVIEW_PORT } from './services/previewRunner.js';

/** Attach /preview proxy — local server and Render only (not imported on Vercel). */
export function attachPreviewProxy(app) {
  app.use(
    '/preview',
    createProxyMiddleware({
      target: `http://127.0.0.1:${PREVIEW_PORT}`,
      changeOrigin: true,
      ws: true,
    }),
  );
}
