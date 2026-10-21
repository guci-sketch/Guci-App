import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Klien Supabase server-side (Storage & Admin API).
 * Membaca `VITE_SUPABASE_URL` secara otomatis (dengan fallback `SUPABASE_URL` untuk kompatibilitas)
 * sehingga URL proyek tidak perlu ditulis dua kali di file `.env`.
 */
export function getSupabaseUrl(): string | undefined {
  return process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export const isSupabaseStorageConfigured = Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      'VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi untuk menggunakan Supabase Storage / Admin API.'
    );
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Nama bucket standar untuk foto bukti lapangan (otomatis dibuat oleh skrip SQL database). */
export const EVIDENCE_BUCKET = 'evidence-photos';
