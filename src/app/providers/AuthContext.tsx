import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppUser } from '@/entities/types';
import { supabase } from '@/shared/lib/supabase';
import { fetchAppUser } from '@/shared/api/authProfile';
import { useAuthStore } from '@/app/store/authStore';

interface AuthContextValue {
  user: AppUser | null;
  status: 'checking' | 'authenticated' | 'unauthenticated';
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  /**
   * Satu pintu untuk mengubah state auth. Mengisi context DAN store zustand sekaligus.
   * Sebelumnya hanya form login yang mengisi zustand, sementara ±20 halaman membaca zustand:
   * setelah refresh browser (sesi dipulihkan oleh context ini) `useAuthStore().user` tetap null
   * dan halaman-halaman itu kosong/menolak sampai pengguna login ulang.
   */
  const applyUser = useCallback((u: AppUser | null) => {
    setUserState(u);
    setStatus(u ? 'authenticated' : 'unauthenticated');
    const store = useAuthStore.getState();
    store.setUser(u);
    store.setLoading(false);
  }, []);

  const hydrate = useCallback(async (uid: string | null) => {
    if (!uid) { applyUser(null); return; }
    const res = await fetchAppUser(uid);
    if (!res.user) {
      console.warn('[auth]', (res.message ?? 'Akun tidak dapat digunakan.'));
      await supabase.auth.signOut();
      applyUser(null);
      return;
    }
    applyUser(res.user);
  }, [applyUser]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) void hydrate(session?.user.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Jangan memanggil API Supabase lain langsung di dalam callback ini (bisa deadlock) — tunda satu tick.
      // INITIAL_SESSION sudah ditangani getSession(); TOKEN_REFRESHED tidak mengubah profil.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      setTimeout(() => { if (!cancelled) void hydrate(event === 'SIGNED_OUT' ? null : session?.user.id ?? null); }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hydrate]);

  const login = useCallback(async (email: string, pass: string) => {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (authErr) throw authErr;
    const res = await fetchAppUser(authData.user.id);
    if (!res.user) {
      await supabase.auth.signOut();
      throw new Error((res.message ?? 'Akun tidak dapat digunakan.'));
    }
    applyUser(res.user);
  }, [applyUser]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    applyUser(null);
  }, [applyUser]);

  return <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
