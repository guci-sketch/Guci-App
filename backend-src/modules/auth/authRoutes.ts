import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';

export const authRouter = Router();

/**
 * Identitas sepenuhnya dikelola Supabase Auth (login, daftar, lupa password, undangan). Express TIDAK lagi
 * menerbitkan token atau menyimpan kata sandi.
 *
 * Dihapus dari versi sebelumnya (semuanya berbahaya atau mati setelah login pindah ke Supabase):
 *  - POST /reset-password  → tanpa autentikasi, mengatur ulang password siapa pun ke "12345678" (pengambilalihan akun)
 *  - rahasia JWT bawaan di kode (token palsu bisa diterbitkan siapa saja)
 *  - /login, /signup, /invite (digantikan Supabase Auth + RPC accept_invite)
 */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const u = req.user!;
    res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role, companyId: u.companyId } });
  })
);
