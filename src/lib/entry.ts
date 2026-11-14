import type { Route } from '@/games/kachuful/state/types';
import { GAME_IDS, type GameId } from '@/platform/route';

/** Where an account page returns to once it is done: a game, or the landing page. */
export type ReturnTo = GameId | 'landing';
const RETURNS: readonly string[] = [...GAME_IDS, 'landing'];

/**
 * The search part that opens an account page from anywhere: `go('kachuful', authSearch('signin', 'ishaara'))`.
 * The page reads `from` back with `returnTo` and goes there on success and on Back.
 */
export const authSearch = (open: 'signin' | 'account', from?: ReturnTo) =>
  `?open=${open}${from ? `&from=${from}` : ''}`;

/** The page an account screen should return to, or null for Kachuful's own history. */
export function returnTo(route: Route): ReturnTo | null {
  const from = route.params?.from;
  return from && RETURNS.includes(from) ? (from as ReturnTo) : null;
}

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
    const from = q.get('from');
    q.delete('open');
    q.delete('from');
    const rest = q.toString();
    history.replaceState(
      history.state,
      '',
      location.pathname + (rest ? '?' + rest : '') + location.hash,
    );
    taken = {
      href: location.href,
      route: from && RETURNS.includes(from) ? { screen: open, params: { from } } : { screen: open },
    };
    return taken.route;
  }
  return null;
}
