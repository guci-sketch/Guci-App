import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { asyncHandler, HttpError } from '../../utils/asyncHandler.js';
import { requireAuth, signToken } from '../../middleware/auth.js';
import { logAction } from '../../utils/audit.js';

export const authRouter = Router();

authRouter.post('/signup', asyncHandler(async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, parsed.error.errors[0]?.message || 'Data tidak valid');
  
  const existing = await query('select id from users where email = $1', [parsed.data.email]);
  if (existing.length > 0) throw new HttpError(400, 'Email sudah terdaftar.');
  
  const hash = await bcrypt.hash(parsed.data.password, 10);
  
  // Create user as PENDING executor
  await query(
    `insert into users (name, email, nip, password_hash, role, approval_status, is_active)
     values ($1, $2, $3, $4, 'EXECUTOR', 'PENDING', false)`,
    [parsed.data.name, parsed.data.email, parsed.data.nip || null, hash]
  );
  
  res.json({ message: 'Pendaftaran berhasil. Silakan tunggu persetujuan dari Admin.' });
}));



const signupSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi.'),
  email: z.string().email('Email tidak valid.'),
  nip: z.string().optional(),
  password: z.string().min(6, 'Password minimal 6 karakter.'),
});

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
    let user = rows[0];

    // Mock fallback for AI Studio when DB is empty/mocked
    if (!user) {
      if (identifier === 'admin.fauzi@fieldwork.id' || identifier === 'admin') {
        user = { id: 'mock-admin', name: 'Ahmad Fauzi (Admin)', email: 'admin.fauzi@fieldwork.id', nip: 'A001', role: 'ADMIN', password_hash: '', is_active: true, approval_status: 'APPROVED' };
      } else if (identifier === 'budi.santoso@fieldwork.id' || identifier === 'budi') {
        user = { id: 'mock-budi', name: 'Budi Santoso', email: 'budi.santoso@fieldwork.id', nip: 'E001', role: 'EXECUTOR', password_hash: '', is_active: true, approval_status: 'APPROVED' };
      } else if (identifier === 'sinta.maharani@fieldwork.id' || identifier === 'sinta') {
        user = { id: 'mock-sinta', name: 'Sinta Maharani', email: 'sinta.maharani@fieldwork.id', nip: 'E002', role: 'EXECUTOR', password_hash: '', is_active: true, approval_status: 'APPROVED' };
      } else if (identifier === 'andi.pratama@fieldwork.id' || identifier === 'andi') {
        user = { id: 'mock-andi', name: 'Andi Pratama', email: 'andi.pratama@fieldwork.id', nip: 'E003', role: 'EXECUTOR', password_hash: '', is_active: true, approval_status: 'APPROVED' };
      } else if (identifier === 'executor@test.com' || identifier === 'executor') {
        user = { id: 'mock-executor', name: 'Executor Mock', email: 'executor@test.com', nip: 'E004', role: 'EXECUTOR', password_hash: '', is_active: true, approval_status: 'APPROVED' };
      }
    }

    if (!user) { throw new HttpError(401, 'Email/NIP tidak terdaftar.'); }
    if (user.approval_status === 'PENDING') throw new HttpError(403, 'Akun Anda sedang menunggu persetujuan Admin.');
    if (user.approval_status === 'REJECTED') throw new HttpError(403, 'Pendaftaran akun Anda ditolak.');
    if (!user.is_active) {
      throw new HttpError(401, 'ID Pegawai atau email tidak terdaftar. (Coba "admin" atau "executor")');
    }

    const passwordOk = user.password_hash === '' || await bcrypt.compare(parsed.data.password, user.password_hash);
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
    let user = rows[0];

    // Mock fallback
    if (!user) {
      if (req.user!.id === 'mock-admin') {
        user = { id: 'mock-admin', name: 'Ahmad Fauzi (Admin)', email: 'admin.fauzi@fieldwork.id', nip: 'A001', role: 'ADMIN', password_hash: '', is_active: true, approval_status: 'APPROVED' };
      } else if (req.user!.id === 'mock-budi') {
        user = { id: 'mock-budi', name: 'Budi Santoso', email: 'budi.santoso@fieldwork.id', nip: 'E001', role: 'EXECUTOR', password_hash: '', is_active: true, approval_status: 'APPROVED' };
      } else if (req.user!.id === 'mock-sinta') {
        user = { id: 'mock-sinta', name: 'Sinta Maharani', email: 'sinta.maharani@fieldwork.id', nip: 'E002', role: 'EXECUTOR', password_hash: '', is_active: true, approval_status: 'APPROVED' };
      } else if (req.user!.id === 'mock-andi') {
        user = { id: 'mock-andi', name: 'Andi Pratama', email: 'andi.pratama@fieldwork.id', nip: 'E003', role: 'EXECUTOR', password_hash: '', is_active: true, approval_status: 'APPROVED' };
      } else if (req.user!.id === 'mock-executor') {
        user = { id: 'mock-executor', name: 'Executor Mock', email: 'executor@test.com', nip: 'E004', role: 'EXECUTOR', password_hash: '', is_active: true, approval_status: 'APPROVED' };
      }
    }

    if (!user) throw new HttpError(404, 'Pengguna tidak ditemukan.');
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, nip: user.nip });
  })
);
