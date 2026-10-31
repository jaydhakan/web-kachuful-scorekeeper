/**
 * The app's only network code (with the rest of src/sync): same-origin fetch, the CSRF header on writes, and errors
 * mapped to the contract's codes. A signed-out app never calls any of this.
 */

export const API = '/api';

/** A failed call: the contract's error code (or 'offline' when nothing came back), status and body. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly body: Record<string, unknown> = {},
  ) {
    super(typeof body.message === 'string' ? body.message : code);
    this.name = 'ApiError';
  }
  get offline() {
    return this.status === 0;
  }
}

export interface Res<T> {
  data: T;
  status: number;
  etag: string | null;
}

export interface CallOpts {
  signal?: AbortSignal;
  /** Sent as If-None-Match; a 304 then resolves with `data: null` and status 304. */
  etag?: string | null;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Listeners told about every 401, so the session can be marked stale wherever it happened. */
const on401 = new Set<() => void>();
export const onUnauthenticated = (f: () => void) => {
  on401.add(f);
  return () => void on401.delete(f);
};

export async function call<T>(
  method: Method,
  path: string,
  body?: unknown,
  o: CallOpts = {},
): Promise<Res<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-Kachuful'] = '1';
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (o.etag) headers['If-None-Match'] = o.etag;
  let res: Response;
  try {
    res = await fetch(API + path, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: o.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(0, 'offline');
  }
  const etag = res.headers.get('ETag');
  if (res.status === 304) return { data: null as T, status: 304, etag };
  const text = res.status === 204 ? '' : await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const b = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
    const code = typeof b.code === 'string' ? b.code : res.status >= 500 ? 'server' : 'error';
    if (res.status === 401) on401.forEach((f) => f());
    throw new ApiError(res.status, code, b);
  }
  return { data: json as T, status: res.status, etag };
}

const q = (params: Record<string, string | number | boolean | null | undefined>) => {
  const s = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return s ? '?' + s : '';
};

export const get = <T>(path: string, params = {}, o?: CallOpts) =>
  call<T>('GET', path + q(params), undefined, o).then((r) => r.data);
export const post = <T>(path: string, body?: unknown) =>
  call<T>('POST', path, body ?? {}).then((r) => r.data);
export const put = <T>(path: string, body: unknown) =>
  call<T>('PUT', path, body).then((r) => r.data);
export const patch = <T>(path: string, body: unknown) =>
  call<T>('PATCH', path, body).then((r) => r.data);
export const del = (path: string) => call<null>('DELETE', path).then(() => undefined);
export { q as query };

/** A sentence for an error code, for the screens that show one. */
export function errorText(e: unknown, texts: Record<string, string>, fallback: string): string {
  if (e instanceof ApiError)
    return texts[e.code] ?? (e.offline ? texts.offline : undefined) ?? fallback;
  return fallback;
}
