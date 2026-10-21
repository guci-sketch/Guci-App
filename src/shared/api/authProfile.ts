import type { AppUser } from '@/entities/types';
import { supabase } from '@/shared/lib/supabase';
import { mapDbRole, USER_PROFILE_COLUMNS } from '@/shared/lib/roles';
import { acceptInvite, readPendingInvite, clearPendingInvite } from '@/shared/api/inviteService';

/** Status perusahaan yang boleh memakai aplikasi. TRIAL ikut diizinkan — masa percobaan memang untuk dipakai. */
const ALLOWED_COMPANY_STATUS = ['ACTIVE', 'TRIAL'];

/** `user` terisi bila sukses; bila gagal `user` null dan `message` berisi alasan yang aman ditampilkan. (Bentuk datar — tsconfig belum strict, narrowing union diskriminan tidak andal.) */
export interface ProfileResult { user: AppUser | null; message: string | null }

/**
 * Memuat profil pengguna + memvalidasi akun & langganan perusahaan.
 * Dipakai di login DAN saat sesi dipulihkan (refresh halaman). Sebelumnya pemeriksaan ini hanya ada di
 * form login, sehingga pengguna yang dinonaktifkan / perusahaan yang disuspend tetap bisa masuk selama
 * token sesinya masih berlaku. (Ini pengaman UX di klien — penegakan sebenarnya harus di RLS/server.)
 */
export async function fetchAppUser(uid: string): Promise<ProfileResult> {
    let { data: u, error } = await supabase.from('users').select(USER_PROFILE_COLUMNS).eq('id', uid).maybeSingle();
    if (!error && !u) {
        // Akun Auth ada tetapi profil belum: selesaikan undangan yang tertunda (alur konfirmasi email), lalu coba lagi.
        const pending = readPendingInvite();
        if (pending) {
            try {
                await acceptInvite(pending.token, pending.name, pending.phone);
                ({ data: u, error } = await supabase.from('users').select(USER_PROFILE_COLUMNS).eq('id', uid).maybeSingle());
            } catch (e) {
                clearPendingInvite();
                return { user: null, message: e instanceof Error ? e.message : 'Undangan tidak dapat diselesaikan.' };
            }
        }
    }
    if (error || !u) return { user: null, message: 'Data akun tidak ditemukan di sistem. Hubungi administrator.' };
    if (!u.is_active) return { user: null, message: 'Akun Anda dinonaktifkan. Hubungi administrator perusahaan.' };

    const role = mapDbRole(u.role);
    if (role !== 'SUPERADMIN') {
        const { data: company } = await supabase.from('companies').select('status').eq('id', u.company_id).maybeSingle();
        if (!company || !ALLOWED_COMPANY_STATUS.includes(company.status)) {
            return { user: null, message: 'Langganan perusahaan Anda tidak aktif. Hubungi Super Admin.' };
        }
    }

    return {
        message: null,
        user: {
            uid: u.id,
            name: u.name,
            email: u.email,
            role,
            companyId: u.company_id,
            isActive: u.is_active,
            wa: u.phone,
            nip: u.nip,
        },
    };
}
