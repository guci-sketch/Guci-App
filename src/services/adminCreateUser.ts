import {
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
} from "../lib/firebase";
import { doc, setDoc } from "../lib/firebase";
import { authSecondary, db, auth } from "../lib/firebase";
import type { UserRole } from "../types";

export interface CreateUserParams {
    email: string;
    password: string;
    name: string;
    role: Extract<UserRole, "ADMIN" | "MARKETING" | "ADMIN" | "TEKNISI_LAPANGAN">;
    companyId: string;
    jabatan?: string;
    wa?: string;
}

export async function createUserByAdmin(params: CreateUserParams): Promise<string> {
    const credential = await createUserWithEmailAndPassword(
        authSecondary,
        params.email,
        params.password,
    );
    const uid = credential.user.uid;

    let firestoreOk = false;
    try {
        await setDoc(doc(db, "users", uid), {
            uid,
            email: params.email,
            name: params.name,
            role: params.role,
            companyId: params.companyId,
            isActive: true,
            jabatan: params.jabatan ?? "",
            wa: params.wa ?? "",
        });
        firestoreOk = true;
    } catch (firestoreErr) {
        try {
            if ((credential.user as any).delete) await (credential.user as any).delete();
        } catch (_e) {
            void _e;
        }
        try {
            await signOut(authSecondary);
        } catch (_e) {
            void _e;
        }
        throw firestoreErr;
    }

    if (firestoreOk) {
        try {
            await signOut(authSecondary);
        } catch (_e) {
            void _e;
        }
    }

    return uid!;
}

export async function sendActivationEmail(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
}