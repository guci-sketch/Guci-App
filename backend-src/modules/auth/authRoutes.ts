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
  role: z.enum(['ADMIN', 'TEKNISI']).optional().default('TEKNISI'),
  honeypot: z.string().optional()
});

authRouter.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.errors[0]?.message || 'Data tidak valid.');

    // Honeypot check for bots
    if (parsed.data.honeypot && parsed.data.honeypot.trim() !== '') {
      // Intentionally delay to stall bots before throwing
      await new Promise(resolve => setTimeout(resolve, 2000));
      throw new HttpError(400, 'Aktivitas robotik terdeteksi.');
    }

    const existing = await query('select id from users where email = $1', [parsed.data.email.toLowerCase()]);
    if (existing.length > 0) throw new HttpError(400, 'Email sudah terdaftar.');

    const hash = await bcrypt.hash(parsed.data.password, 10);
    const dbRole = parsed.data.role === 'ADMIN' ? 'ADMIN' : 'EXECUTOR';
    
    // For AI Studio demo purposes: automatically activate the account so the user can test logging in immediately
    await query(
      `insert into users (name, email, nip, password_hash, role, is_active)
       values ($1,$2,$3,$4,$5,true)`,
      [parsed.data.name.trim(), parsed.data.email.toLowerCase().trim(), parsed.data.nip?.trim() || null, hash, dbRole]
    );

    res.json({ message: 'Pendaftaran berhasil. Silakan masuk dengan akun baru Anda.' });
  })
);

const loginSchema = z.object({
  identifier: z.string().min(1, 'Masukkan ID Pegawai atau email.'),
  password: z.string().min(1, 'Masukkan kata sandi.'),
  honeypot: z.string().optional()
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
    
    // Honeypot check for bots
    if (parsed.data.honeypot && parsed.data.honeypot.trim() !== '') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      throw new HttpError(400, 'Aktivitas robotik terdeteksi.');
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

const resetPasswordSchema = z.object({
  identifier: z.string().min(1, 'Masukkan ID Pegawai atau email.'),
});

authRouter.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Data tidak valid.');
    }
    const identifier = parsed.data.identifier.trim().toLowerCase();
    const rows = await query<UserRow>(
      `select * from users where lower(email) = $1 or lower(nip) = $1 limit 1`,
      [identifier]
    );
    const user = rows[0];
    if (!user) {
      throw new HttpError(404, 'ID Pegawai atau email tidak terdaftar.');
    }

    const defaultPassword = '12345678';
    const hash = await bcrypt.hash(defaultPassword, 10);
    
    await query(`update users set password_hash = $1 where id = $2`, [hash, user.id]);
    await logAction(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      'RESET_PASSWORD',
      'system',
      null,
      `Kata sandi untuk ${user.name} telah direset ke default.`
    );

    res.json({ message: 'Kata sandi berhasil di-reset menjadi 12345678. Silakan login dan segera ganti kata sandi Anda.' });
  })
);

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Masukkan kata sandi lama.'),
  newPassword: z.string().min(6, 'Kata sandi baru minimal 6 karakter.'),
});

authRouter.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Data tidak valid.');
    }

    const rows = await query<UserRow>('select * from users where id = $1', [req.user!.id]);
    const user = rows[0];
    if (!user) throw new HttpError(404, 'Pengguna tidak ditemukan.');

    const passwordOk = await bcrypt.compare(parsed.data.oldPassword, user.password_hash);
    if (!passwordOk) {
      throw new HttpError(401, 'Kata sandi lama tidak sesuai.');
    }

    const hash = await bcrypt.hash(parsed.data.newPassword, 10);
    await query(`update users set password_hash = $1 where id = $2`, [hash, user.id]);

    await logAction(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      'CHANGE_PASSWORD',
      'system',
      null,
      `${user.name} telah mengubah kata sandi mereka.`
    );

    res.json({ message: 'Kata sandi berhasil diubah.' });
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
