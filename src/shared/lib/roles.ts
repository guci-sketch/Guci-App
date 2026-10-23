import type { UserRole } from '@/entities/types';

/** Nilai enum `user_role` pada database live (6-Role SaaS Hierarchy). */
export const DB_ROLES = [
    'MASTER_SUPER_ADMIN',
    'SUPERADMIN',
    'ADMIN',
    'MARKETING',
    'INVENTORY',
    'TEKNISI_LAPANGAN',
] as const;

export function isUserRole(value: unknown): value is UserRole {
    return typeof value === 'string' && (DB_ROLES as readonly string[]).includes(value);
}

/** Khusus pemilik platform SaaS (secret role, hanya kelola Perusahaan & Token Undangan Superadmin). */
export function isMasterSuperAdmin(role?: UserRole | string | null): boolean {
    return role === 'MASTER_SUPER_ADMIN';
}

/** Direktur / Superadmin Perusahaan Tenant. */
export function isSuperOrMaster(role?: UserRole | string | null): boolean {
    return role === 'SUPERADMIN';
}

/** Direktur (SUPERADMIN) atau Staf Admin Perusahaan (ADMIN). */
export function isAdminOrAbove(role?: UserRole | string | null): boolean {
    return role === 'SUPERADMIN' || role === 'ADMIN';
}

export function mapDbRole(role: unknown): UserRole {
    if (isUserRole(role)) return role;
    console.warn(`[roles] Role tidak dikenal dari database: ${String(role)} — diperlakukan sebagai TEKNISI_LAPANGAN.`);
    return 'TEKNISI_LAPANGAN';
}

/** Kolom profil yang aman dimuat ke browser (TANPA password_hash). */
export const USER_PROFILE_COLUMNS = 'id, company_id, name, email, nip, role, phone, is_active';
