import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppUser } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: AppUser | null;
  status: 'checking' | 'authenticated' | 'unauthenticated';
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        setStatus('unauthenticated');
        return;
      }
      
      const { data: userData } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      if (userData) {
          setUser({
              uid: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              companyId: userData.company_id,
              isActive: userData.is_active,
              wa: userData.phone,
          });
          setStatus('authenticated');
      } else {
          setStatus('unauthenticated');
      }
    });
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (authErr) throw authErr;
      
      const { data: userData } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
      if (userData) {
          setUser({
              uid: userData.id,
              name: userData.name,
              email: userData.email,
              role: userData.role,
              companyId: userData.company_id,
              isActive: userData.is_active,
              wa: userData.phone,
          });
          setStatus('authenticated');
      }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  return <AuthContext.Provider value={{ user, status, login, logout }}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}