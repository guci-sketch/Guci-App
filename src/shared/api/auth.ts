import { supabase } from '@/shared/lib/supabase';
import { createInvite } from '@/shared/api/inviteService';
import type { Invite } from '@/shared/api/inviteService';
import { api } from '@/shared/api/client';

/**
 * Login, daftar, dan lupa password sepenuhnya ditangani Supabase Auth (lihat LoginForm / SignupPage /
 * sendPasswordResetEmail). Fungsi login/signup/reset-password versi Express sudah dihapus — termasuk endpoint
 * server yang mengatur ulang password siapa pun tanpa autentikasi.
 */

/** Ganti password: verifikasi password lama (login ulang), lalu perbarui di Supabase Auth. */
export async function changePassword(oldPassword: string, newPassword: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('Sesi tidak ditemukan. Silakan masuk kembali.');
  const { error: verifyErr } = await supabase.auth.signInWithPassword({ email: user.email, password: oldPassword });
  if (verifyErr) throw new Error('Kata sandi lama salah.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
  return 'Kata sandi berhasil diubah.';
}

/** Membuat tautan undangan (berlaku 7 hari, sekali pakai) untuk perusahaan admin yang sedang login. */
export async function generateInvite(
  role: Invite['role'],
  ctx: { companyId: string; createdBy: string },
): Promise<{ token: string; expiresAt: Date }> {
  try {
    const res = await api.post<{ token: string; expiresAt: string }>('/admin/invites', {
      role,
      companyId: ctx.companyId,
    });
    if (res?.token) {
      return { token: res.token, expiresAt: new Date(res.expiresAt) };
    }
  } catch (apiErr) {
    console.warn('[auth] Gagal generate invite via server API, mencoba fallback client:', apiErr);
  }

  const { data } = await supabase.from('companies').select('company_name').eq('id', ctx.companyId).maybeSingle();
  const token = await createInvite({ companyId: ctx.companyId, companyName: data?.company_name ?? '', role, createdBy: ctx.createdBy });
  return { token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
}
