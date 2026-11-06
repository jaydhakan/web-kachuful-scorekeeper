import { API } from './api';
import type { LiveResp, ReactionKind } from './types';

export type LiveEvent =
  | { type: 'game'; data: LiveResp }
  | { type: 'revoked' }
  /** A spectator's cheer; not stored, so only those connected see it. */
  | { type: 'reaction'; kind: ReactionKind }
  /** How many people follow the table (the scorer's own phone not counted). */
  | { type: 'watchers'; n: number }
  /** A dropped connection the browser is retrying. */
  | { type: 'error' }
  /** The server refused the stream (404 or 410): it won't come back by itself. */
  | { type: 'closed' };

/**
 * Follows a live table: an EventSource on the public events stream. The browser reconnects by itself and sends
 * Last-Event-ID (the game's rev), so a dropped connection resumes; a revoked link ends it.
 */
export function followLive(
  token: string,
  on: (e: LiveEvent) => void,
  { host = false }: { host?: boolean } = {},
): () => void {
  if (typeof EventSource === 'undefined') {
    on({ type: 'error' });
    return () => {};
  }
  const es = new EventSource(
    `${API}/public/live/${encodeURIComponent(token)}/events${host ? '?host=1' : ''}`,
    // A members-only table needs the session cookie.
    { withCredentials: true },
  );
  const read = <T>(e: Event): T | null => {
    try {
      return JSON.parse((e as MessageEvent<string>).data) as T;
    } catch {
      return null;
    }
  };
  es.addEventListener('reaction', (e) => {
    const d = read<{ kind: ReactionKind }>(e);
    if (d) on({ type: 'reaction', kind: d.kind });
  });
  es.addEventListener('watchers', (e) => {
    const d = read<{ n: number }>(e);
    if (d) on({ type: 'watchers', n: d.n });
  });
  es.addEventListener('game', (e) => {
    try {
      on({ type: 'game', data: JSON.parse((e as MessageEvent<string>).data) as LiveResp });
    } catch {
      /* a bad frame is skipped; the next one carries the whole game */
    }
  });
  es.addEventListener('revoked', () => {
    on({ type: 'revoked' });
    es.close();
  });
  es.onerror = () => on({ type: es.readyState === EventSource.CLOSED ? 'closed' : 'error' });
  return () => es.close();
}
