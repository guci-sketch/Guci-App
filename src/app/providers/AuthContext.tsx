import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppUser } from '@/entities/types';
import { supabase } from '@/shared/lib/supabase';
import { fetchAppUser } from '@/shared/api/authProfile';
import { useAuthStore } from '@/app/store/authStore';

interface AuthContextValue {
  user: AppUser | null;
  status: 'checking' | 'authenticated' | 'unauthenticated';
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<AppUser | null>(null);
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

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
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      hydrate(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') {
        applyUser(null);
      } else if (session?.user?.id) {
        hydrate(session.user.id);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [hydrate, applyUser]);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await hydrate(session?.user?.id ?? null);
  }, [hydrate]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    applyUser(null);
  }, [applyUser]);

  return (
    <AuthContext.Provider value={{ user, status, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
