import type { Route } from '@/games/kachuful/state/types';

const KINDS = { invite: 'invite', reset: 'reset', live: 'live', recap: 'recap' } as const;

/**
 * A link that opens a screen (`/?invite=…`, `?reset=`, `?live=`, `?recap=`): read once at start, then removed from
 * the address bar so a reload or a shared screenshot doesn't carry the token.
 */
let taken: { href: string; route: Route } | null = null;

export function readEntryLink(): Route | null {
  if (typeof location === 'undefined') return null;
  // StrictMode runs the store's initialiser twice; the second run must see the link the first one removed.
  if (taken?.href === location.href) return taken.route;
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
    taken = { href: location.href, route: { screen, params: { token } } };
    return taken.route;
  }
  // The landing page's account chip and menu: `/kachuful?open=account` (these pages still live in Kachuful).
  const open = q.get('open');
  if (open === 'account' || open === 'signin' || open === 'credits') {
    q.delete('open');
    const rest = q.toString();
    history.replaceState(
      history.state,
      '',
      location.pathname + (rest ? '?' + rest : '') + location.hash,
    );
    taken = { href: location.href, route: { screen: open } };
    return taken.route;
  }
  return null;
}
