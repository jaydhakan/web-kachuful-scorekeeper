import type { Route } from '@/state/types';

const KINDS = { invite: 'invite', reset: 'reset', live: 'live', recap: 'recap' } as const;

/**
 * A link that opens a screen (`/?invite=…`, `?reset=`, `?live=`, `?recap=`): read once at start, then removed from
 * the address bar so a reload or a shared screenshot doesn't carry the token.
 */
export function readEntryLink(): Route | null {
  if (typeof location === 'undefined') return null;
  const q = new URLSearchParams(location.search);
  for (const [k, screen] of Object.entries(KINDS)) {
    const token = q.get(k);
    if (!token) continue;
    q.delete(k);
    const rest = q.toString();
    history.replaceState(
      history.state,
      '',
      location.pathname + (rest ? '?' + rest : '') + location.hash,
    );
    return { screen, params: { token } };
  }
  return null;
}
