import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthUser } from '../types';
import { getToken, setToken as persistToken } from '../api/client';
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from '../api/auth';

interface AuthContextValue {
  user: AuthUser | null;
  status: 'checking' | 'authenticated' | 'unauthenticated';
  login: (identifier: string, password: string, captchaToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setStatus('unauthenticated');
      return;
    }
    fetchCurrentUser()
      .then(u => {
        setUser(u);
        setStatus('authenticated');
      })
      .catch(() => {
        persistToken(null);
        setStatus('unauthenticated');
      });
  }, []);

  const login = useCallback(async (identifier: string, password: string, captchaToken: string) => {
    const u = await loginRequest(identifier, password, captchaToken);
    setUser(u);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    logoutRequest();
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
