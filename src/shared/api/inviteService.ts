/**
 * Invite Service — token-based user & Superadmin onboarding
 */

import {
    collection, addDoc, Timestamp,
} from '@/shared/lib/firebase';
import { db } from '@/shared/lib/firebase';
import type { UserRole } from '@/entities/types';
import { supabase } from '@/shared/lib/supabase';

const COL = "invites";
const EXPIRE_DAYS = 7;

export type InviteRole = Extract<
    UserRole,
    "SUPERADMIN" | "ADMIN" | "MARKETING" | "INVENTORY" | "TEKNISI_LAPANGAN"
>;

export interface Invite {
    id: string;
    companyId: string;
    companyName: string;
    role: InviteRole;
    createdBy: string;
    createdAt: Date;
    expiresAt: Date;
    used: boolean;
    usedBy: string | null;
}

export interface CreateInviteParams {
    companyId: string;
    companyName: string;
    role: InviteRole;
    createdBy: string;
}

/**
 * Buat invite baru (mendukung undangan SUPERADMIN oleh Master Super Admin maupun staf oleh Admin perusahaan).
 * Return token (= ID baris tabel `invites`).
 */
export async function createInvite(params: CreateInviteParams): Promise<string> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRE_DAYS * 24 * 60 * 60 * 1000);

    const ref = await addDoc(collection(db, COL), {
        companyId: params.companyId,
        companyName: params.companyName,
        role: params.role,
        createdBy: params.createdBy,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
        used: false,
        usedBy: null,
    });

    return ref.id;
}

/**
 * Mengambil daftar token undangan untuk suatu perusahaan (opsional difilter berdasarkan role, mis. 'SUPERADMIN').
 */
export async function getInvitesByCompany(companyId: string, roleFilter?: InviteRole): Promise<Invite[]> {
    const { data, error } = await supabase
        .from('invites')
        .select('id, company_id, payload, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

    if (error || !data) return [];

    const list: Invite[] = data.map((row: any) => {
        const p = row.payload || {};
        return {
            id: row.id,
            companyId: row.company_id,
            companyName: p.companyName || '',
            role: (p.role || 'SUPERADMIN') as InviteRole,
            createdBy: p.createdBy || '',
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            expiresAt: p.expiresAt ? new Date(p.expiresAt) : new Date(Date.now() + 7 * 86400000),
            used: Boolean(p.used),
            usedBy: p.usedBy || null,
        };
    });

    return roleFilter ? list.filter(i => i.role === roleFilter) : list;
}

/**
 * Menghapus / mencabut token undangan.
 */
export async function revokeInvite(token: string): Promise<void> {
    const { error } = await supabase.from('invites').delete().eq('id', token);
    if (error) throw new Error(error.message);
}

/**
 * Memvalidasi token undangan (boleh dipanggil TANPA login — dipakai halaman daftar `/signup`).
 */
export async function getInviteByToken(token: string): Promise<Invite | null> {
    const cleanToken = token.trim();
    if (!cleanToken) return null;

    // 1. Coba verifikasi melalui backend API server
    try {
        const res = await fetch(`/api/auth/invite/${encodeURIComponent(cleanToken)}`);
        if (res.ok) {
            const d = await res.json();
            return {
                id: d.token,
                companyId: d.companyId,
                companyName: d.companyName,
                role: d.role,
                createdBy: '',
                createdAt: new Date(),
                expiresAt: new Date(d.expiresAt),
                used: false,
                usedBy: null,
            };
        }
        if (res.status === 400 || res.status === 404) {
            const errData = await res.json().catch(() => null);
            throw new Error(errData?.message || 'Token undangan tidak valid atau sudah kedaluwarsa.');
        }
    } catch (apiErr) {
        if (apiErr instanceof Error && (apiErr.message.includes('kedaluwarsa') || apiErr.message.includes('sudah') || apiErr.message.includes('tidak ditemukan'))) {
            throw apiErr;
        }
        console.warn('[inviteService] Backend invite verification fallback ke Supabase RPC:', apiErr);
    }

    // 2. Fallback via Supabase RPC get_invite_public
    const { data, error } = await supabase.rpc('get_invite_public', { p_token: cleanToken });
    if (error) throw new Error(error.message);
    if (!data) return null;
    const d = data as { token: string; companyId: string; companyName: string; role: InviteRole; expiresAt: string };
    return {
        id: d.token,
        companyId: d.companyId,
        companyName: d.companyName,
        role: d.role,
        createdBy: '',
        createdAt: new Date(),
        expiresAt: new Date(d.expiresAt),
        used: false,
        usedBy: null,
    };
}

const PENDING_KEY = 'fw_pending_invite_v1';

export function rememberPendingInvite(token: string, name: string, phone?: string) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify({ token, name, phone })); } catch { /* abaikan */ }
}
export function readPendingInvite(): { token: string; name: string; phone?: string } | null {
    try { const v = localStorage.getItem(PENDING_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function clearPendingInvite() {
    try { localStorage.removeItem(PENDING_KEY); } catch { /* abaikan */ }
}

/**
 * Menerima undangan untuk pengguna yang sedang mendaftar/login via RPC `accept_invite`.
 */
export async function acceptInvite(token: string, name: string, phone?: string): Promise<void> {
    const { error } = await supabase.rpc('accept_invite', { p_token: token.trim(), p_name: name, p_phone: phone ?? null });
    if (error) throw new Error(error.message);
    clearPendingInvite();
}
