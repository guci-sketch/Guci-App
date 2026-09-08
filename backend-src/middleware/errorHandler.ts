import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/asyncHandler.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  const message = err instanceof Error ? err.message : 'Unknown error';

  if (message.startsWith('PROJECT_LOCKED')) {
    return res.status(409).json({
      error: 'Proyek sudah terkunci sejak check-in pertama dan tidak dapat diubah.',
    });
  }

  console.error('[error]', err);
  return res.status(500).json({ error: 'Terjadi kesalahan pada server. Coba lagi sebentar lagi.' });
}
