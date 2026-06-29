/**
 * Vercel serverless entry when Render root directory is `backend`.
 * @see docs/DEPLOY_VERCEL.md
 */
import serverless from 'serverless-http';
import app from '../src/app.js';

export const config = {
  maxDuration: 300,
};

export default serverless(app, {
  binary: ['application/zip'],
});
