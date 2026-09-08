import { api, setToken } from './client';
import { AuthUser } from '../types';

export async function login(identifier: string, password: string) {
  const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { identifier, password });
  setToken(res.token);
  return res.user;
}

export function logout() {
  setToken(null);
}

export async function fetchCurrentUser() {
  return api.get<AuthUser>('/auth/me');
}

export async function signup(name: string, email: string, nip: string, password: string) {
  const res = await api.post<{ message: string }>('/auth/signup', { name, email, nip, password });
  return res.message;
}
