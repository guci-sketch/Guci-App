import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { asyncHandler, HttpError } from '../../utils/asyncHandler.js';
import { requireAuth, signToken } from '../../middleware/auth.js';
import { logAction } from '../../utils/audit.js';

export const authRouter = Router();

const loginSchema = z.object({
  identifier: z.string().min(1, 'Masukkan ID Pegawai atau email.'),
  password: z.string().min(1, 'Masukkan kata sandi.'),
});

interface UserRow {
  id: string;
  name: string;
  email: string;
  nip: string | null;
  role: 'ADMIN' | 'EXECUTOR';
  password_hash: string;
  is_active: boolean;
}

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Data tidak valid.');
    }
    const identifier = parsed.data.identifier.trim().toLowerCase();

    const rows = await query<UserRow>(
      `select * from users where lower(email) = $1 or lower(nip) = $1 limit 1`,
      [identifier]
    );
    const user = rows[0];

    if (!user || !user.is_active) {
      throw new HttpError(401, 'ID Pegawai atau email tidak terdaftar.');
    }

    const passwordOk = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!passwordOk) {
      throw new HttpError(401, 'Kata sandi tidak sesuai.');
    }

    const authUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    const token = signToken(authUser);

    await logAction(authUser, 'LOGIN', 'system', null, `${user.name} (${user.role}) masuk ke sistem.`);

    res.json({
      token,
      user: { ...authUser, nip: user.nip },
    });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rows = await query<UserRow>('select * from users where id = $1', [req.user!.id]);
    const user = rows[0];
    if (!user) throw new HttpError(404, 'Pengguna tidak ditemukan.');
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, nip: user.nip });
  })
);
