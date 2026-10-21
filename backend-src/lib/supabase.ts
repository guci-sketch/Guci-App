import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase is used for two things in production: the Postgres database
 * (via DATABASE_URL, see db/pool.ts — plain `pg`, no Supabase client needed
 * for that) and Storage (evidence photos, via this client with the service
 * role key so the server can read/write a private bucket directly).
 *
 * Locally, if SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY aren't set, photo
 * storage falls back to local disk (see modules/photos/storage.ts) so
 * `npm run dev` works without a cloud account.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseStorageConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseStorageConfigured) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use Supabase Storage. ' +
        'Use the service role key (never the anon key) — this client runs server-side only.'
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export const EVIDENCE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'evidence-photos';
