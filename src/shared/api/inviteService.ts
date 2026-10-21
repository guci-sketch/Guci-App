/**
 * Invite Service — token-based user onboarding
 * Firestore collection: `invites`
 */

import {
    collection, addDoc, Timestamp,
} from '@/shared/lib/firebase';
import { db } from '@/shared/lib/firebase';
import type { UserRole } from '@/entities/types';
import { supabase } from '@/shared/lib/supabase';

const COL = "invites";
const EXPIRE_DAYS = 7;

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface Invite {
    id: string;
    companyId: string;
    companyName: string;
    role: Extract<UserRole, "ADMIN" | "MARKETING" | "INVENTORY" | "TEKNISI_LAPANGAN">;
    createdBy: string;
    createdAt: Date;
    expiresAt: Date;
    used: boolean;
    usedBy: string | null;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export interface CreateInviteParams {
    companyId: string;
    companyName: string;
    role: Invite["role"];
    createdBy: string;
}

/**
 * Buat invite baru. Return token (= document ID Firestore).
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

    return ref.id; // token = document ID
}

// ─── READ ─────────────────────────────────────────────────────────────────────

/**
 * Memvalidasi token undangan (boleh dipanggil TANPA login — dipakai halaman daftar).
 * Lewat RPC `get_invite_public`: anon hanya bisa memeriksa satu token yang ia ketahui, tidak bisa membaca/
 * menelusuri tabel `invites`. Return null bila tidak ada, sudah dipakai, atau kedaluwarsa.
 */
export async function getInviteByToken(token: string): Promise<Invite | null> {
    const { data, error } = await supabase.rpc('get_invite_public', { p_token: token });
    if (error) throw new Error(error.message);
    if (!data) return null;
    const d = data as { token: string; companyId: string; companyName: string; role: Invite['role']; expiresAt: string };
    return {
        id: d.token, companyId: d.companyId, companyName: d.companyName, role: d.role,
        createdBy: '', createdAt: new Date(), expiresAt: new Date(d.expiresAt), used: false, usedBy: null,
    };
}

// ─── ACCEPT ───────────────────────────────────────────────────────────────────

const PENDING_KEY = 'fw_pending_invite_v1';

/** Simpan undangan yang belum bisa diterima (mis. menunggu konfirmasi email) agar diselesaikan saat login pertama. */
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
 * Menerima undangan untuk pengguna yang SEDANG login: server (RPC `accept_invite`) membuat baris `users` dengan
 * perusahaan & role DARI UNDANGAN — bukan dari klien — lalu menandai undangan terpakai secara atomik.
 */
export async function acceptInvite(token: string, name: string, phone?: string): Promise<void> {
    const { error } = await supabase.rpc('accept_invite', { p_token: token, p_name: name, p_phone: phone ?? null });
    if (error) throw new Error(error.message);
    clearPendingInvite();
}
