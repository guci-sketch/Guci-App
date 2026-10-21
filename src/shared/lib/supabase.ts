import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Sebelumnya: fallback ke 'https://xxx.supabase.co' / 'eyJ...' bila env kosong, sehingga build produksi yang
// lupa env berjalan "normal" tetapi semua request gagal dengan error jaringan yang membingungkan.
if (!supabaseUrl || !supabaseKey) {
    const msg =
        'VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum diatur. Salin .env.example menjadi .env lalu isi nilainya ' +
        '(di Vercel: Project Settings → Environment Variables, lalu deploy ulang).';
    if (import.meta.env.PROD) throw new Error(msg);
    console.warn('[supabase] ' + msg);
}

export const supabase = createClient(supabaseUrl || 'http://localhost:54321', supabaseKey || 'missing-anon-key');

/**
 * Klien terisolasi TANPA persistensi sesi. Dipakai untuk membuat akun pengguna lain (signUp) tanpa
 * menimpa sesi admin yang sedang login — `supabase.auth.signUp` pada klien utama akan otomatis
 * berpindah sesi ke akun baru.
 */
export function createIsolatedSupabaseClient() {
    return createClient(supabaseUrl || 'http://localhost:54321', supabaseKey || 'missing-anon-key', {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sb-isolated-signup' },
    });
}
