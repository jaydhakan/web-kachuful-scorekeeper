import type { Route } from '@/games/kachuful/state/types';
import { GAME_IDS, type GameId } from '@/platform/route';

/** Where an account page returns to once it is done: a game, or the landing page. */
export type ReturnTo = GameId | 'landing';
const RETURNS: readonly string[] = [...GAME_IDS, 'landing'];

// What a game may ask to be reopened with after sign-in: a Spades join code or table, an Ishaara game.
const BACK_KEYS = ['join', 'table', 'game'];
const BACK_VALUE = /^[\w-]{1,80}$/;

/** Only the known keys with plain values survive, so a crafted link can't carry anything else back. */
function safeBack(raw: string | null | undefined): string {
  if (!raw) return '';
  const q = new URLSearchParams(raw.startsWith('?') ? raw : '?' + raw);
  const out = new URLSearchParams();
  for (const k of BACK_KEYS) {
    const v = q.get(k);
    if (v && BACK_VALUE.test(v)) out.set(k, v);
  }
  const s = out.toString();
  return s ? '?' + s : '';
}

/**
 * The search part that opens an account page from anywhere: `go('kachuful', authSearch('signin', 'ishaara'))`.
 * The page reads `from` back with `returnTo` and goes there on success and on Back; `back` (`?join=KQ7M`) is the
 * search that game is reopened with, so a link followed signed out still lands where it pointed.
 */
export function authSearch(open: 'signin' | 'account', from?: ReturnTo, back?: string) {
  const b = from && from !== 'landing' ? safeBack(back) : '';
  return `?open=${open}${from ? `&from=${from}` : ''}${b ? `&back=${encodeURIComponent(b)}` : ''}`;
}

/** The page an account screen should return to, or null for Kachuful's own history. */
export function returnTo(route: Route): ReturnTo | null {
  const from = route.params?.from;
  return from && RETURNS.includes(from) ? (from as ReturnTo) : null;
}

/** The search to reopen that page with (`?join=KQ7M`), or ''. */
export const returnSearch = (route: Route): string => safeBack(route.params?.back);

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
    const back = safeBack(q.get('back'));
    q.delete('open');
    q.delete('from');
    q.delete('back');
    const rest = q.toString();
    history.replaceState(
      history.state,
      '',
      location.pathname + (rest ? '?' + rest : '') + location.hash,
    );
    taken = {
      href: location.href,
      route:
        from && RETURNS.includes(from)
          ? { screen: open, params: back ? { from, back } : { from } }
          : { screen: open },
    };
    return taken.route;
  }
  return null;
}
