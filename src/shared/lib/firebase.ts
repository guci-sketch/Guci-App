// Firebase Compatibility Layer over Supabase
import { supabase } from "./supabase";

export const db = {};
export const auth = {};
export const authSecondary = {};
export const storage = {};

export function collection(dbObj: any, path: string) {
    return { path };
}

export function doc(dbObj: any, path: string, id?: string) {
    return { path, id };
}

export function query(col: any, ...constraints: any[]) {
    return { col, constraints };
}

export function where(field: string, op: string, value: any) {
    return { type: "where", field, op, value };
}

export function orderBy(field: string, dir: string = "asc") {
    return { type: "orderBy", field, dir };
}

export async function getDocs(q: any) {
    let sbQuery: any = supabase.from(q.col.path).select("*");
    if (q.constraints) {
        for (const c of q.constraints) {
            if (c.type === "where") {
                if (c.op === "==") sbQuery = sbQuery.eq(c.field, c.value);
                if (c.op === ">=") sbQuery = sbQuery.gte(c.field, c.value);
                if (c.op === "<=") sbQuery = sbQuery.lte(c.field, c.value);
                if (c.op === ">") sbQuery = sbQuery.gt(c.field, c.value);
                if (c.op === "<") sbQuery = sbQuery.lt(c.field, c.value);
            }
            if (c.type === "orderBy") {
                sbQuery = sbQuery.order(c.field, { ascending: c.dir === "asc" });
            }
        }
    }
    const { data, error } = await sbQuery;
    if (error) console.error("getDocs error", error);
    
    return {
        docs: (data || []).map((d: any) => ({
            id: d.id,
            data: () => d,
            ref: { path: q.col.path, id: d.id }
        })),
        size: (data || []).length,
        empty: (data || []).length === 0
    };
}

export async function getDoc(ref: any) {
    const { data, error } = await supabase.from(ref.path).select("*").eq("id", ref.id).single();
    if (error || !data) {
        return { exists: () => false, data: () => null, id: ref.id };
    }
    return { exists: () => true, data: () => data, id: ref.id, ref };
}

export async function setDoc(ref: any, data: any, options?: any) {
    const { error } = await supabase.from(ref.path).upsert({ id: ref.id, ...data });
    if (error) console.error("setDoc error", error);
}

export async function updateDoc(ref: any, data: any) {
    const { error } = await supabase.from(ref.path).update(data).eq("id", ref.id);
    if (error) console.error("updateDoc error", error);
}

export async function addDoc(col: any, data: any) {
    const { data: res, error } = await supabase.from(col.path).insert(data).select().single();
    if (error) console.error("addDoc error", error);
    return { id: res?.id || "temp-id" };
}

export async function deleteDoc(ref: any) {
    const { error } = await supabase.from(ref.path).delete().eq("id", ref.id);
    if (error) console.error("deleteDoc error", error);
}

export const Timestamp = {
    fromDate: (date: Date) => ({ toDate: () => date }),
    now: () => ({ toDate: () => new Date() })
};
export type Timestamp = any;

export function writeBatch(dbObj: any) {
    const operations: any[] = [];
    return {
        set: (ref: any, data: any) => operations.push({ type: "set", ref, data }),
        update: (ref: any, data: any) => operations.push({ type: "update", ref, data }),
        delete: (ref: any) => operations.push({ type: "delete", ref }),
        commit: async () => {
            for (const op of operations) {
                if (op.type === "set") await setDoc(op.ref, op.data);
                if (op.type === "update") await updateDoc(op.ref, op.data);
                if (op.type === "delete") await deleteDoc(op.ref);
            }
        }
    };
}

// Auth mock
export function onAuthStateChanged(authObj: any, callback: (user: any) => void) {
    supabase.auth.getSession().then(({ data: { session } }) => {
        callback(session?.user ? { uid: session.user.id, emailVerified: true } : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(session?.user ? { uid: session.user.id, emailVerified: true } : null);
    });
    return () => subscription.unsubscribe();
}

export async function signInWithEmailAndPassword(authObj: any, email: string, pass: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return { user: { uid: data.user.id } };
}

export async function signOut(authObj: any) {
    await supabase.auth.signOut();
}

export async function sendPasswordResetEmail(authObj: any, email: string) {
    await supabase.auth.resetPasswordForEmail(email);
}

export async function createUserWithEmailAndPassword(authObj: any, email: string, pass: string) {
    const { data, error } = await supabase.auth.signUp({ email, password: pass });
    if (error) throw error;
    return { user: { uid: data.user?.id } };
}
