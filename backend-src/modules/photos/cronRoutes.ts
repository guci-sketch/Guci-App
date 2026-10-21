import { timingSafeEqual } from 'node:crypto';
import { Request, Response, Router } from 'express';
import { asyncHandler, HttpError } from '../../utils/asyncHandler.js';
import { purgeOldPhotos } from './retention.js';
import { logSystemAction } from '../../utils/audit.js';
import { query } from '../../db/pool.js';

export const cronRouter = Router();

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Retensi foto terjadwal (lihat `crons` di vercel.json).
 * Cron TIDAK membawa JWT pengguna, jadi dijaga shared secret. Vercel Cron mengirim
 * `Authorization: Bearer $CRON_SECRET` otomatis bila env CRON_SECRET diset di proyek.
 *
 * PENTING: Vercel Cron memanggil endpoint dengan HTTP **GET**. Rute lama hanya menerima POST,
 * sehingga (selain `crons` memang tidak pernah ada di vercel.json) pemanggilan cron akan 404.
 * Rute ini menerima GET (Vercel) dan POST (pemicu manual).
 */
const purgeHandler = asyncHandler(async (req: Request, res: Response) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new HttpError(500, 'CRON_SECRET belum dikonfigurasi di server.');
  }
  const provided = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
  if (!safeEqual(provided, secret)) {
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

  // Riwayat GPS bertambah tiap beberapa menit per teknisi → bersihkan agar tabel tidak membengkak.
  const days = Number(process.env.LOCATION_RETENTION_DAYS || 30);
  const del = await query<{ n: string }>(
    `with d as (delete from user_locations where tracked_at < now() - make_interval(days => $1) returning 1) select count(*)::text as n from d`,
    [days]
  );
  res.json({ ...result, locationsDeleted: Number(del[0]?.n ?? 0) });
});

cronRouter.get('/purge-photos', purgeHandler);
cronRouter.post('/purge-photos', purgeHandler);
