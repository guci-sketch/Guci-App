/**
 * Vercel entrypoint. A Vercel Node.js Serverless Function is just a
 * (req, res) handler — which is exactly what an Express app already is, so
 * this file is a thin re-export rather than a rewrite of the app.
 *
 * With no rewrites in vercel.json, Vercel routes /api/* to this file
 * automatically (filesystem-based routing); Express's own router (mounted
 * on /api/... paths in backend-src/app.ts) does the rest.
 */
import { createApp } from '../backend-src/app.js';

const app = createApp();

export default app;
