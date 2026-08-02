export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  details?: string[];

  constructor(status: number, message: string, details?: string[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const REFRESH_STORAGE_KEY = 'vaultx_refresh_token';

let accessToken: string | null = null;
// Persisted so sessions survive page reloads. Note: the backend also sets an
// httpOnly SameSite=Lax cookie, but that cookie is NOT sent cross-site
// (frontend.vercel.app -> backend.vercel.app), so we keep the rotated token here.
// This is a supported server-side rotation flow: every refresh returns a NEW token
// and invalidates the previous one, so a leaked token has a short usable life.
let refreshToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_STORAGE_KEY) : null;
let refreshInFlight: Promise<string | null> | null = null;
let sessionListeners: Array<(loggedIn: boolean) => void> = [];

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setRefreshToken(token: string | null): void {
  refreshToken = token;
  if (typeof localStorage !== 'undefined') {
    if (token) localStorage.setItem(REFRESH_STORAGE_KEY, token);
    else localStorage.removeItem(REFRESH_STORAGE_KEY);
  }
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function onSessionChange(listener: (loggedIn: boolean) => void): () => void {
  sessionListeners.push(listener);
  return () => {
    sessionListeners = sessionListeners.filter((l) => l !== listener);
  };
}

function emit(loggedIn: boolean): void {
  for (const listener of sessionListeners) listener(loggedIn);
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { accessToken: string; refreshToken?: string };
        accessToken = data.accessToken;
        // Rotate + persist the new refresh token (the old one is now revoked server-side).
        if (data.refreshToken) setRefreshToken(data.refreshToken);
        emit(true);
        return data.accessToken;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
  retry?: boolean;
}

async function doFetch<T>(path: string, opts: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined && !opts.formData) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    credentials: 'include',
    body: opts.formData ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    signal: opts.signal,
  });

  if (res.status === 401 && opts.retry !== false) {
    const newToken = await refreshAccessToken();
    if (newToken) return doFetch<T>(path, { ...opts, retry: false });
    emit(false);
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let details: string[] | undefined;
    try {
      const data = await res.json();
      if (typeof data?.message === 'string') message = data.message;
      if (Array.isArray(data?.message)) message = data.message.join(', ');
      if (Array.isArray(data?.details)) details = data.details;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(res.status, message, details);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return doFetch<T>(path, { method: 'GET', signal });
  },
  post<T>(path: string, body?: unknown, opts?: { formData?: FormData; signal?: AbortSignal }): Promise<T> {
    return doFetch<T>(path, { method: 'POST', body, formData: opts?.formData, signal: opts?.signal });
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return doFetch<T>(path, { method: 'PATCH', body });
  },
  delete<T>(path: string, body?: unknown): Promise<T> {
    return doFetch<T>(path, { method: 'DELETE', body });
  },
  upload<T>(path: string, formData: FormData, signal?: AbortSignal): Promise<T> {
    return doFetch<T>(path, { method: 'POST', formData, signal });
  },
};
