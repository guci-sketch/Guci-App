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

export async function signup(name: string, email: string, nip: string, password: string, role: string, captchaToken: string) {
  const res = await api.post<{ message: string }>('/auth/signup', { name, email, nip, password, role, captchaToken });
  return res.message;
}

export async function resetPassword(identifier: string) {
  const res = await api.post<{ message: string }>('/auth/reset-password', { identifier });
  return res.message;
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const res = await api.post<{ message: string }>('/auth/change-password', { oldPassword, newPassword });
  return res.message;
}
