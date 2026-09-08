import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { authRouter } from './modules/auth/authRoutes.js';
import { projectRouter } from './modules/projects/projectRoutes.js';
import { workReportRouter } from './modules/workReports/workReportRoutes.js';
import { photoRouter } from './modules/photos/photoRoutes.js';
import { adminRouter } from './modules/admin/adminRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Supports a comma-separated list so a staging domain and the Vercel
  // preview-deployment URL can both be allowed alongside production, e.g.
  // CORS_ORIGIN="https://fieldwork.app,https://fieldwork-web.vercel.app"
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error(`Origin ${origin} tidak diizinkan oleh CORS.`));
      },
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'fieldwork-api' }));

  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectRouter);
  app.use('/api/work-reports', workReportRouter);
  app.use('/api/photos', photoRouter);
  app.use('/api/admin', adminRouter);

  app.use((req, res) => res.status(404).json({ error: `Rute tidak ditemukan: ${req.method} ${req.path}` }));
  app.use(errorHandler);

  return app;
}
