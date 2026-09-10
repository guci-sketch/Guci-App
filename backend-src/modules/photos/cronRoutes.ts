import { Router } from 'express';
import { asyncHandler, HttpError } from '../../utils/asyncHandler.js';
import { purgeOldPhotos } from './retention.js';
import { logSystemAction } from '../../utils/audit.js';

export const cronRouter = Router();

/**
 * Scheduled photo retention (see vercel.json's `crons` entry).
 * Cron invocations don't carry a logged-in user's JWT, so this is gated by
 * a shared secret instead of requireAuth/requireRole. Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET` automatically when CRON_SECRET is
 * set as an env var on the project — see README for setup.
 */
cronRouter.post(
  '/purge-photos',
  asyncHandler(async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      throw new HttpError(500, 'CRON_SECRET belum dikonfigurasi di server.');
    }
    const provided = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (provided !== secret) {
      throw new HttpError(401, 'Unauthorized cron request.');
    }

    const months = Number(process.env.PHOTO_RETENTION_MONTHS || 2);
    const result = await purgeOldPhotos(months);

    await logSystemAction(
      'PURGE_PHOTOS',
      'system',
      null,
      `[cron] Menghapus file foto lebih lama dari ${months} bulan: ${result.purgedCount} berhasil, ${result.failedCount} gagal.`
    );

    res.json(result);
  })
);
