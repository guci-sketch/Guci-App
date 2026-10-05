/**
 * Invite Service — token-based user onboarding
 * Firestore collection: `invites`
 */

import {
    collection, doc, getDoc, addDoc, updateDoc, Timestamp,
} from '@/shared/lib/firebase';
import { db } from '@/shared/lib/firebase';
import type { UserRole } from '@/entities/types';

const COL = "invites";
const EXPIRE_DAYS = 7;

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface Invite {
    id: string;
    companyId: string;
    companyName: string;
    role: Extract<UserRole, "ADMIN" | "MARKETING" | "ADMIN" | "TEKNISI_LAPANGAN">;
    createdBy: string;
    createdAt: Date;
    expiresAt: Date;
    used: boolean;
    usedBy: string | null;
}

function toInvite(id: string, data: Record<string, unknown>): Invite {
    return {
        id,
        companyId: data.companyId as string,
        companyName: data.companyName as string,
        role: data.role as Invite["role"],
        createdBy: data.createdBy as string,
        createdAt: (data.createdAt as Timestamp).toDate(),
        expiresAt: (data.expiresAt as Timestamp).toDate(),
        used: (data.used as boolean) ?? false,
        usedBy: (data.usedBy as string | null) ?? null,
    };
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
 * Ambil invite berdasarkan token.
 * Return null jika tidak ada, sudah dipakai, atau expired.
 */
export async function getInviteByToken(token: string): Promise<Invite | null> {
    const snap = await getDoc(doc(db, COL, token));
    if (!snap.exists()) return null;

    const invite = toInvite(snap.id, snap.data() as Record<string, unknown>);

    if (invite.used) return null;
    if (invite.expiresAt < new Date()) return null;

    return invite;
}

// ─── MARK USED ────────────────────────────────────────────────────────────────

export async function markInviteUsed(token: string, uid: string): Promise<void> {
    await updateDoc(doc(db, COL, token), {
        used: true,
        usedBy: uid,
    });
}
