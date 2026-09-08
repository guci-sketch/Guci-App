import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { asyncHandler, HttpError } from '../../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

export const locationRouter = Router();

locationRouter.use(requireAuth);

const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
});

// Pelaksana records their location
locationRouter.post(
  '/',
  requireRole('EXECUTOR'),
  asyncHandler(async (req, res) => {
    const parsed = locationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Data lokasi tidak valid.');
    }
    const d = parsed.data;

    await query(
      `insert into user_locations (user_id, latitude, longitude, accuracy) values ($1, $2, $3, $4)`,
      [req.user!.id, d.latitude, d.longitude, d.accuracy]
    );

    res.status(201).json({ success: true });
  })
);

// Admin fetches latest locations of all executors
locationRouter.get(
  '/latest',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    // Get the most recent location for each user
    const rows = await query(`
      select distinct on (l.user_id)
        l.id, l.user_id, u.name as user_name, u.email as user_email, u.phone as user_phone,
        l.latitude, l.longitude, l.accuracy, l.tracked_at
      from user_locations l
      join users u on u.id = l.user_id
      order by l.user_id, l.tracked_at desc
    `);
    
    res.json({
      locations: rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        userPhone: r.user_phone,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        accuracy: Number(r.accuracy),
        trackedAt: r.tracked_at
      }))
    });
  })
);
