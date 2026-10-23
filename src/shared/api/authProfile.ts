import type { AppUser } from '@/entities/types';
import { supabase } from '@/shared/lib/supabase';
import { mapDbRole, USER_PROFILE_COLUMNS } from '@/shared/lib/roles';
import { acceptInvite, readPendingInvite, clearPendingInvite } from '@/shared/api/inviteService';

/** Status perusahaan yang boleh memakai aplikasi. TRIAL ikut diizinkan — masa percobaan memang untuk dipakai. */
const ALLOWED_COMPANY_STATUS = ['ACTIVE', 'TRIAL'];

/** `user` terisi bila sukses; bila gagal `user` null dan `message` berisi alasan yang aman ditampilkan. */
export interface ProfileResult { user: AppUser | null; message: string | null }

/**
 * Memuat profil pengguna + memvalidasi akun & langganan perusahaan.
 * Hanya MASTER_SUPER_ADMIN yang bebas dari pemeriksaan status aktif perusahaan tenant.
 * Jika perusahaan disuspend oleh MASTER_SUPER_ADMIN, maka SUPERADMIN (Direktur) maupun staf perusahaan tersebut otomatis tertahan.
 */
export async function fetchAppUser(uid: string): Promise<ProfileResult> {
    let { data: u, error } = await supabase.from('users').select(USER_PROFILE_COLUMNS).eq('id', uid).maybeSingle();
    if (!error && !u) {
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
    if (!u.is_active) return { user: null, message: 'Akun Anda sedang ditangguhkan (suspended). Hubungi administrator.' };

    const role = mapDbRole(u.role);
    if (role !== 'MASTER_SUPER_ADMIN') {
        if (!u.company_id) {
            return { user: null, message: 'Akun belum terhubung ke perusahaan mana pun.' };
        }
        const { data: company } = await supabase.from('companies').select('status').eq('id', u.company_id).maybeSingle();
        if (!company || !ALLOWED_COMPANY_STATUS.includes(company.status)) {
            return { user: null, message: 'Langganan perusahaan Anda sedang ditangguhkan (suspended) atau berakhir.' };
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
