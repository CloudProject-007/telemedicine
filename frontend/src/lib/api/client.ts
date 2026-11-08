import { env } from '@/config/env';
import type { AuthResult, Paginated, PaginationMeta } from '@/types/api';

/** An error response from the API (or a network failure, status 0). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/* ---------------------------------- tokens ---------------------------------- */

const REFRESH_KEY = 'telecare.refreshToken';

/** The short-lived access token lives in memory only; the refresh token survives page reloads. */
let accessToken: string | null = null;

export const tokenStore = {
  getAccess: (): string | null => accessToken,
  getRefresh: (): string | null => {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  set(tokens: { accessToken: string; refreshToken: string }): void {
    accessToken = tokens.accessToken;
    try {
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    } catch {
      // Storage unavailable (private mode): the session just will not survive a reload.
    }
  },
  clear(): void {
    accessToken = null;
    try {
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      // Nothing to clear.
    }
  },
};

const expiredListeners = new Set<() => void>();

/** Subscribe to "the session can no longer be refreshed" (the user must sign in again). */
export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

/* ---------------------------------- refresh --------------------------------- */

export type RefreshOutcome =
  | { kind: 'ok'; session: AuthResult }
  | { kind: 'expired' }
  | { kind: 'offline' };

/**
 * The backend rotates refresh tokens and treats reuse of an old one as theft (it revokes every
 * session). So refreshing must never run twice with the same token:
 *  - calls in this tab share one in-flight request, and
 *  - a Web Lock serialises tabs; the token is re-read inside the lock, so a second tab uses the
 *    token the first tab just stored.
 */
let inflight: Promise<RefreshOutcome> | null = null;

export function refreshSession(): Promise<RefreshOutcome> {
  inflight ??= withRefreshLock(performRefresh).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  // The lock callback returns a promise, so await it to get T rather than Promise<T>.
  return locks ? await locks.request('telecare-refresh', task) : await task();
}

async function performRefresh(): Promise<RefreshOutcome> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) {
    return { kind: 'expired' };
  }

  let response: Response;
  try {
    response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // The server is unreachable: keep the tokens so the user is not signed out by a bad connection.
    return { kind: 'offline' };
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 400) {
      tokenStore.clear();
      return { kind: 'expired' };
    }
    return { kind: 'offline' };
  }

  const body = (await parseBody(response)) as Envelope<AuthResult> | undefined;
  if (!body?.data) {
    return { kind: 'offline' };
  }
  tokenStore.set(body.data.tokens);
  return { kind: 'ok', session: body.data };
}

/* --------------------------------- requests --------------------------------- */

interface Envelope<T> {
  data: T;
  meta?: PaginationMeta;
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: unknown };
}

type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Set false for public endpoints (login, register). Default true. */
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(env.VITE_API_URL.replace(/\/+$/, '') + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function send(
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.auth !== false && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot reach the server. Check your connection and try again.',
    );
  }
}

function toApiError(response: Response, body: unknown): ApiError {
  const error = (body as ErrorEnvelope | undefined)?.error;
  return new ApiError(
    response.status,
    error?.code ?? 'UNKNOWN',
    error?.message ?? `Request failed (${response.status})`,
    error?.details,
  );
}

async function execute(
  path: string,
  options: RequestOptions,
): Promise<Envelope<unknown> | undefined> {
  let response = await send(path, options, tokenStore.getAccess());

  // An expired access token: refresh once, then replay the request.
  if (response.status === 401 && options.auth !== false) {
    const outcome = await refreshSession();
    if (outcome.kind === 'ok') {
      response = await send(path, options, tokenStore.getAccess());
    } else if (outcome.kind === 'expired') {
      expiredListeners.forEach((listener) => listener());
    }
  }

  const body = await parseBody(response);
  if (!response.ok) {
    throw toApiError(response, body);
  }
  return body as Envelope<unknown> | undefined;
}

/** Request returning the unwrapped `data` of the response envelope. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const body = (await execute(path, options)) as Envelope<T> | undefined;
  return body?.data as T;
}

/** Request for paginated endpoints. */
export async function apiList<T>(
  path: string,
  options: RequestOptions = {},
): Promise<Paginated<T>> {
  const body = (await execute(path, options)) as Envelope<T[]> | undefined;
  const items = body?.data ?? [];
  return {
    items,
    meta: body?.meta ?? { page: 1, limit: items.length, total: items.length, totalPages: 1 },
  };
}
