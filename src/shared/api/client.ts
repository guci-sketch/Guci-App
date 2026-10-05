/**
 * Thin fetch wrapper for the FIELDWORK API.
 *
 * Auth token lives in localStorage under one key. This is an MVP choice —
 * PRD Section 33/50 flags Supabase Auth (with httpOnly cookies) as the
 * production target; swapping the storage mechanism here is the only change
 * needed when that migration happens.
 */

// Hardcode to relative path since backend and frontend are served from the same origin.
// Ignore VITE_API_URL if it points to localhost to avoid browser fetch errors.
const API_URL = '/api';
const TOKEN_KEY = 'fieldwork_token_v1';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | undefined>;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

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
    setToken(null);
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
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new ApiError(response.status, 'Foto tidak dapat dimuat.');
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
