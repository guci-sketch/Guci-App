import { Router } from 'express';
import { query } from '../../db/pool.js';
import { asyncHandler, HttpError } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { readPhoto } from './storage.js';

export const photoRouter = Router();
photoRouter.use(requireAuth);

/**
 * Evidence photos are never served from a public bucket (PRD Section 50).
 * Every request is authenticated and checked against the owning work report
 * before the file is streamed back — the same access rule a Supabase
 * signed-URL policy would enforce in production.
 */
photoRouter.get(
  '/:id/file',
  asyncHandler(async (req, res) => {
    const rows = await query(
      `select dp.storage_path, wr.executor_id from documentation_photos dp
       join work_reports wr on wr.id = dp.work_report_id
       where dp.id = $1`,
      [req.params.id]
    );
    const photo = rows[0];
    if (!photo) throw new HttpError(404, 'Foto tidak ditemukan.');
    if (req.user!.role === 'EXECUTOR' && photo.executor_id !== req.user!.id) {
      throw new HttpError(403, 'Anda tidak memiliki akses ke foto ini.');
    }

    const buffer = await readPhoto(photo.storage_path);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(buffer);
  })
);
