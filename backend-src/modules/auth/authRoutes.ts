import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../../db/pool.js';
import { asyncHandler, HttpError } from '../../utils/asyncHandler.js';
import { requireAuth } from '../../middleware/auth.js';
import { getSupabaseClient, isSupabaseStorageConfigured } from '../../lib/supabase.js';

export const authRouter = Router();

const registerInviteSchema = z.object({
  token: z.string().min(1, 'Token undangan wajib disertakan.'),
  name: z.string().min(2, 'Nama minimal 2 karakter.'),
  email: z.string().email('Format email tidak valid.').max(255),
  password: z.string().min(6, 'Password minimal 6 karakter.').max(100),
  phone: z.string().max(50).optional(),
});

/**
 * Registrasi akun baru menggunakan token undangan resmi (di-generate oleh Admin/Direktur).
 * Akun dibuat di sisi server dengan `email_confirm: true` sehingga langsung aktif tanpa
 * terhambat email confirmation link atau kendala `otp_expired`.
 */
authRouter.post(
  '/register-invite',
  asyncHandler(async (req, res) => {
    const parsed = registerInviteSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.errors[0]?.message ?? 'Data registrasi tidak valid.');
    }
    const d = parsed.data;
    const cleanToken = d.token.trim();
    const emailClean = d.email.trim().toLowerCase();

    // 1. Validasi token undangan dari database
    const inviteRows = await query<{ id: string; company_id: string; payload: any }>(
      'select id, company_id, payload from invites where id = $1',
      [cleanToken]
    );
    if (inviteRows.length === 0) {
      throw new HttpError(404, 'Token undangan tidak ditemukan.');
    }
    const inv = inviteRows[0];
    const payload = inv.payload || {};
    if (payload.used) {
      throw new HttpError(400, 'Token undangan ini sudah pernah digunakan.');
    }
    if (payload.expiresAt && new Date(payload.expiresAt).getTime() <= Date.now()) {
      throw new HttpError(400, 'Token undangan ini sudah kedaluwarsa.');
    }

    const role = payload.role || 'TEKNISI_LAPANGAN';
    const companyId = inv.company_id;

    let uid: string;

    // 2. Buat / aktifkan akun login di Supabase Auth dengan email_confirm: true
    if (isSupabaseStorageConfigured) {
      const sbAdmin = getSupabaseClient().auth.admin;

      // Cek apakah user sudah pernah mendaftar di auth tapi belum terkonfirmasi
      const { data: userList } = await sbAdmin.listUsers({ page: 1, perPage: 1000 });
      const existingAuth = (userList?.users || []).find(u => u.email?.toLowerCase() === emailClean);

      if (existingAuth) {
        uid = existingAuth.id;
        // Auto-confirm email dan perbarui password agar langsung aktif
        const { error: updErr } = await sbAdmin.updateUserById(uid, {
          password: d.password,
          email_confirm: true,
        });
        if (updErr) {
          console.warn('[register-invite] Update auth existing gagal:', updErr.message);
        }
      } else {
        const { data: created, error: createErr } = await sbAdmin.createUser({
          email: emailClean,
          password: d.password,
          email_confirm: true,
        });
        if (createErr || !created.user) {
          throw new HttpError(400, `Gagal membuat akun login: ${createErr?.message ?? 'tidak diketahui'}`);
        }
        uid = created.user.id;
      }
    } else {
      // Fallback lokal dev: cari atau generate UUID
      const existingUser = await query<{ id: string }>('select id from users where email = $1', [emailClean]);
      uid = existingUser[0]?.id || cleanToken;
    }

    // 3. Simpan profil di public.users & tandai token undangan sebagai used
    await withTransaction(async (client) => {
      await client.query(
        `insert into users (id, company_id, name, email, password_hash, role, phone, is_active)
         values ($1, $2, $3, $4, 'managed-by-supabase-auth', $5, $6, true)
         on conflict (id) do update set
           company_id = excluded.company_id,
           name = excluded.name,
           role = excluded.role,
           phone = excluded.phone,
           is_active = true,
           updated_at = now()`,
        [uid, companyId, d.name.trim(), emailClean, role, d.phone || null]
      );

      await client.query(
        `update invites
         set payload = jsonb_set(
           jsonb_set(payload, '{used}', 'true'::jsonb),
           '{usedBy}',
           to_jsonb($2::text)
         )
         where id = $1`,
        [cleanToken, d.name.trim()]
      );
    });

    res.status(201).json({
      success: true,
      message: 'Akun Anda berhasil dibuat dan langsung aktif! Silakan masuk.',
      user: {
        id: uid,
        email: emailClean,
        name: d.name.trim(),
        role,
      },
    });
  })
);

/**
 * Endpoint untuk auto-confirm akun yang tersangkut kendala OTP / link konfirmasi kedaluwarsa.
 */
authRouter.post(
  '/auto-confirm-email',
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      throw new HttpError(400, 'Email wajib diisi.');
    }
    const emailClean = email.trim().toLowerCase();

    if (isSupabaseStorageConfigured) {
      const sbAdmin = getSupabaseClient().auth.admin;
      const { data: userList } = await sbAdmin.listUsers({ page: 1, perPage: 1000 });
      const targetUser = (userList?.users || []).find(u => u.email?.toLowerCase() === emailClean);
      if (targetUser) {
        await sbAdmin.updateUserById(targetUser.id, { email_confirm: true });
        await query('update users set is_active = true where email = $1', [emailClean]);
        return res.json({ success: true, message: 'Email akun Anda telah berhasil dikonfirmasi langsung oleh sistem. Silakan login.' });
      }
    }
    res.json({ success: false, message: 'Akun tidak ditemukan atau sudah aktif.' });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const u = req.user!;
    res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role, companyId: u.companyId } });
  })
);
