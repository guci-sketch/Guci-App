import { supabase } from '@/shared/lib/supabase';
import { useAuthStore } from '@/app/store/authStore';

/**
 * Thin fetch wrapper for the FIELDWORK API.
 *
 * Auth token lives in localStorage under one key. This is an MVP choice —
 * PRD Section 33/50 flags Supabase Auth (with httpOnly cookies) as the
 * production target; swapping the storage mechanism here is the only change
 * needed when that migration happens.
 */

// Backend dan frontend disajikan dari origin yang sama.
const API_URL = '/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Identitas = sesi Supabase Auth (satu-satunya sumber). Backend memverifikasi access token ini, lalu memuat
 * role & perusahaan dari database. Sebelumnya klien memakai token Express terpisah di localStorage yang tak pernah
 * terisi setelah login pindah ke Supabase — akibatnya semua panggilan API ditolak 401.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Header identitas: Bearer token + (khusus SUPERADMIN) perusahaan yang sedang dioperasikan. */
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const st = useAuthStore.getState();
  if (st.user?.role === 'SUPERADMIN' && st.activeCompanyId) headers['X-Company-Id'] = st.activeCompanyId;
  return headers;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | undefined>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers = await authHeaders();

  let url = `${API_URL}${path}`;
  if (opts.query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== '') params.set(k, v);
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData; // browser sets multipart boundary automatically
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let response: Response;
  try {
    response = await fetch(url, { method: opts.method || 'GET', headers, body });
  } catch {
    throw new ApiError(0, 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
  }

  if (response.status === 401) {
    // Sesi tidak lagi diterima server (kedaluwarsa / akun dinonaktifkan) → keluar; AuthContext mengarahkan ke login.
    void supabase.auth.signOut();
  }

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    if (contentType.includes('application/json')) {
      const data = await response.json().catch(() => ({}));
      throw new ApiError(response.status, data.error || 'Terjadi kesalahan. Coba lagi.');
    }
    throw new ApiError(response.status, 'Terjadi kesalahan. Coba lagi.');
  }

  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.blob()) as unknown as T;
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | undefined>) => request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
  postForm: <T>(path: string, formData: FormData) => request<T>(path, { method: 'POST', formData }),
};

/** Fetches a protected resource (e.g. a photo) and returns a local blob: URL for use in <img src>. */
export async function fetchAuthedBlobUrl(path: string): Promise<string> {
  const response = await fetch(`${API_URL}${path}`, { headers: await authHeaders() });
  if (!response.ok) throw new ApiError(response.status, 'Foto tidak dapat dimuat.');
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
