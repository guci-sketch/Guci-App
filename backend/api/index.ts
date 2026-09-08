/**
 * Vercel entrypoint. A Vercel Node.js Serverless Function is just a
 * (req, res) handler — which is exactly what an Express app already is, so
 * this file is a thin re-export rather than a rewrite of the app.
 *
 * `vercel.json` rewrites every request to this one function; Express's own
 * router (mounted on /api/... paths in src/app.ts) does the rest, so the
 * routes behave identically to running `npm run dev` locally.
 */
import { createApp } from '../src/app.js';

const app = createApp();

export default app;
