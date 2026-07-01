/**
 * Vercel serverless entry when project root directory is `backend`.
 * @see docs/DEPLOY_VERCEL.md
 */
export const config = {
  maxDuration: 300,
};

let handler;
let bootError;

async function boot() {
  if (handler) return handler;
  if (bootError) throw bootError;
  try {
    const { default: serverless } = await import('serverless-http');
    const { default: app } = await import('../src/app.js');
    handler = serverless(app, { binary: ['application/zip'] });
    return handler;
  } catch (err) {
    bootError = err;
    console.error('[api] boot failed:', err);
    throw err;
  }
}

export default async function vercelHandler(req, res) {
  try {
    const h = await boot();
    return h(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: err?.message || 'API failed to start',
          hint: 'Check Vercel function logs. For long-running preview + SQLite, use Render (docs/DEPLOY_RENDER.md).',
        }),
      );
    }
  }
}
