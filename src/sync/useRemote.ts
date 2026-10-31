import { useEffect, useRef, useState } from 'react';
import { archive } from '@/state/archive';
import { ApiError, type CallOpts } from './api';

export interface Remote<T> {
  data: T | null;
  /** When the shown data came from the server. */
  fetchedAt: number | null;
  loading: boolean;
  error: ApiError | null;
  /** Showing a cached copy because the server couldn't be reached. */
  offline: boolean;
  reload: () => void;
}

type Loader<T> = (
  o: CallOpts,
) => Promise<T | { data: T | null; status: number; etag: string | null }>;

const isRes = <T>(v: unknown): v is { data: T | null; status: number; etag: string | null } =>
  !!v && typeof v === 'object' && 'status' in v && 'etag' in v && 'data' in v;

/**
 * Cache first, refresh second: the last answer for `key` renders at once (from the archive's cache), then the
 * server is asked again (with If-None-Match when the loader passes it on). A changed key aborts the old request.
 * `key` null means nothing to load (signed out).
 */
export function useRemote<T>(key: string | null, load: Loader<T>): Remote<T> {
  const cached = key ? archive.get('cache', 'r:' + key) : undefined;
  const [state, setState] = useState<Omit<Remote<T>, 'reload'>>(() => ({
    data: (cached?.value as T) ?? null,
    fetchedAt: cached?.fetchedAt ?? null,
    loading: !!key,
    error: null,
    offline: false,
  }));
  const [n, setN] = useState(0);
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    if (!key) return;
    const c = archive.get('cache', 'r:' + key);
    setState({
      data: (c?.value as T) ?? null,
      fetchedAt: c?.fetchedAt ?? null,
      loading: true,
      error: null,
      offline: false,
    });
    const ctl = new AbortController();
    loader
      .current({ signal: ctl.signal, etag: c?.etag })
      .then((r) => {
        if (ctl.signal.aborted) return;
        if (isRes<T>(r) && r.status === 304 && c) {
          archive.put('cache', { ...c, fetchedAt: Date.now() });
          setState((s) => ({ ...s, loading: false, fetchedAt: Date.now() }));
          return;
        }
        const data = isRes<T>(r) ? (r.data as T) : r;
        const etag = isRes<T>(r) ? r.etag : null;
        archive.put('cache', { key: 'r:' + key, value: data, etag, fetchedAt: Date.now() });
        setState({ data, fetchedAt: Date.now(), loading: false, error: null, offline: false });
      })
      .catch((e: unknown) => {
        if (ctl.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return;
        const err = e instanceof ApiError ? e : new ApiError(0, 'offline');
        setState((s) => ({ ...s, loading: false, error: err, offline: err.offline }));
      });
    return () => ctl.abort();
  }, [key, n]);
  return { ...state, reload: () => setN((x) => x + 1) };
}
