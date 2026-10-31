import { API } from './api';
import type { LiveResp } from './types';

export type LiveEvent = { type: 'game'; data: LiveResp } | { type: 'revoked' } | { type: 'error' };

/**
 * Follows a live table: an EventSource on the public events stream. The browser reconnects by itself and sends
 * Last-Event-ID (the game's rev), so a dropped connection resumes; a revoked link ends it.
 */
export function followLive(token: string, on: (e: LiveEvent) => void): () => void {
  if (typeof EventSource === 'undefined') {
    on({ type: 'error' });
    return () => {};
  }
  const es = new EventSource(`${API}/public/live/${encodeURIComponent(token)}/events`);
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
  es.onerror = () => on({ type: 'error' });
  return () => es.close();
}
