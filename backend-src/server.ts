import 'dotenv/config';
import { createApp } from './app.js';

/**
 * Local development only. In production (Vercel), api/index.ts exports the
 * same createApp() as a serverless function instead — this file just runs
 * it as a plain long-lived server on port 3000, which the Vite dev server
 * proxies /api/* to (see vite.config.ts's server.proxy).
 */
const port = Number(process.env.PORT || 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`[fieldwork-api] listening on http://localhost:${port}`);
});
