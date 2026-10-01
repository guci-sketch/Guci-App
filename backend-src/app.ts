import express from 'express';
import 'dotenv/config';
import { authRouter } from './modules/auth/authRoutes.js';
import { projectRouter } from './modules/projects/projectRoutes.js';
import { workReportRouter } from './modules/workReports/workReportRoutes.js';
import { photoRouter } from './modules/photos/photoRoutes.js';
import { adminRouter } from './modules/admin/adminRoutes.js';
import { locationRouter } from './modules/locations/locationRoutes.js';
import { cronRouter } from './modules/photos/cronRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // No CORS middleware: this is a monolith deployment (frontend + API on
  // the same Vercel project, same origin), so the browser never makes a
  // cross-origin request to this API in the first place. If the frontend
  // ever moves to a different domain than the API, add `cors` back here
  // scoped to that specific origin — don't reach for a wide-open `cors()`.
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'fieldwork-api' }));

  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectRouter);
  app.use('/api/work-reports', workReportRouter);
  app.use('/api/photos', photoRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/locations', locationRouter);
  app.use('/api/cron', cronRouter);

  app.use('/api', (req, res) => res.status(404).json({ error: `Rute API tidak ditemukan: ${req.method} ${req.path}` }));
  app.use(errorHandler);

  return app;
}
