import type { UserRole } from '@/entities/types';

/** Nilai enum `user_role` pada database live. */
export const DB_ROLES = ['SUPERADMIN', 'ADMIN', 'MARKETING', 'INVENTORY', 'TEKNISI_LAPANGAN'] as const;

export function isUserRole(value: unknown): value is UserRole {
    return typeof value === 'string' && (DB_ROLES as readonly string[]).includes(value);
}

/**
 * Role DB → role aplikasi. Enum DB dan tipe UserRole identik, jadi pemetaannya identitas.
 * Versi lama memetakan nama yang TIDAK ADA di enum (ADMIN_PERUSAHAAN, TEKNISI, SPV, GUDANG) dengan
 * default TEKNISI_LAPANGAN — akibatnya ADMIN dan INVENTORY yang valid dianggap teknisi lapangan.
 * Role tidak dikenal diperlakukan sebagai hak terendah (TEKNISI_LAPANGAN) dengan peringatan.
 */
export function mapDbRole(role: unknown): UserRole {
    if (isUserRole(role)) return role;
    console.warn(`[roles] Role tidak dikenal dari database: ${String(role)} — diperlakukan sebagai TEKNISI_LAPANGAN.`);
    return 'TEKNISI_LAPANGAN';
}

/** Kolom profil yang aman dimuat ke browser (TANPA password_hash). */
export const USER_PROFILE_COLUMNS = 'id, company_id, name, email, nip, role, phone, is_active';
