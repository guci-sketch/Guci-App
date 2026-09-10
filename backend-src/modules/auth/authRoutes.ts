import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { asyncHandler, HttpError } from '../../utils/asyncHandler.js';
import { requireAuth, signToken } from '../../middleware/auth.js';
import { logAction } from '../../utils/audit.js';

export const authRouter = Router();

const signupSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi.'),
  email: z.string().email('Email tidak valid.'),
  nip: z.string().optional(),
  password: z.string().min(6, 'Password minimal 6 karakter.'),
});

authRouter.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.errors[0]?.message || 'Data tidak valid.');

    const existing = await query('select id from users where email = $1', [parsed.data.email.toLowerCase()]);
    if (existing.length > 0) throw new HttpError(400, 'Email sudah terdaftar.');

    const hash = await bcrypt.hash(parsed.data.password, 10);

    // New self-registered accounts start PENDING and inactive — an admin
    // has to approve them (see /api/admin/users/pending) before they can
    // log in. This is the intended, real behavior, not a bug: it's how a
    // pest control company controls who gets a technician account.
    await query(
      `insert into users (name, email, nip, password_hash, role, approval_status, is_active)
       values ($1,$2,$3,$4,'EXECUTOR','PENDING',false)`,
      [parsed.data.name.trim(), parsed.data.email.toLowerCase().trim(), parsed.data.nip?.trim() || null, hash]
    );

    res.json({ message: 'Pendaftaran berhasil. Silakan tunggu persetujuan dari Admin sebelum dapat masuk.' });
  })
);

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
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
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

    // No mock/fallback accounts here on purpose — every login goes through
    // a real row in the database. If this 404s, it means the account
    // genuinely doesn't exist (or hasn't been seeded/created yet), and the
    // person needs to know that clearly rather than being let in as a fake
    // session with no real data behind it.
    if (!user) {
      throw new HttpError(401, 'ID Pegawai atau email tidak terdaftar.');
    }
    if (user.approval_status === 'PENDING') {
      throw new HttpError(403, 'Akun Anda sedang menunggu persetujuan Admin.');
    }
    if (user.approval_status === 'REJECTED') {
      throw new HttpError(403, 'Pendaftaran akun Anda ditolak.');
    }
    if (!user.is_active) {
      throw new HttpError(401, 'Akun ini tidak aktif. Hubungi Admin.');
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
