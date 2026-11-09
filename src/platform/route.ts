import { useSyncExternalStore } from 'react';

/** The games the site can host; the first path segment names one (`/kachuful`, `/kaali-teeri`). */
export type GameId = 'kachuful' | 'kaali-teeri' | 'ishaara';
export const GAME_IDS: readonly GameId[] = ['kachuful', 'kaali-teeri', 'ishaara'];

const isGame = (s: string): s is GameId => (GAME_IDS as readonly string[]).includes(s);

/** `/Kachuful/` → 'kachuful'; anything that isn't a game (the landing page included) → null. */
export function gameFromPath(path: string): GameId | null {
  const seg = path.split('/').find(Boolean)?.toLowerCase() ?? '';
  return isGame(seg) ? seg : null;
}

export const pathOf = (id: GameId | null) => (id ? `/${id}` : '/');

// Links the site sent before it had paths: Kachuful's screens, opened from `/`.
const OLD_LINKS = ['live', 'recap', 'invite', 'reset'];

/**
 * Where the address should be at boot, or null when it's fine: old `/?live=` style links move to `/kachuful?…`, an
 * unknown path goes to `/`, and a game path is written in its own spelling (`/Kachuful/` → `/kachuful`).
 */
export function entryPath(path: string, search: string): string | null {
  const id = gameFromPath(path);
  if (id) return path === pathOf(id) ? null : pathOf(id) + search;
  const q = new URLSearchParams(search);
  if (OLD_LINKS.some((k) => q.has(k))) return pathOf('kachuful') + search;
  return path === '/' ? null : '/' + search;
}

let current: GameId | null = null;
const subs = new Set<() => void>();
let pending: { id: GameId | null } | null = null;

function set(id: GameId | null) {
  if (id === current) return;
  current = id;
  subs.forEach((f) => f());
}

function push(id: GameId | null) {
  history.pushState(null, '', pathOf(id));
  set(id);
}

function onPop() {
  if (pending) {
    const { id } = pending;
    pending = null;
    push(id);
    return;
  }
  set(gameFromPath(location.pathname));
}

/** Reads (and tidies) the address once, before the first render. */
export function startRoute() {
  const fix = entryPath(location.pathname, location.search);
  if (fix) history.replaceState(history.state, '', fix + location.hash);
  current = gameFromPath(location.pathname);
  window.removeEventListener('popstate', onPop);
  window.addEventListener('popstate', onPop);
}

/**
 * Opens a game, or the landing page with null. A game keeps one history entry per open sheet (`{ kf: n }`, see
 * useHistorySync); those go first, so system Back from the new page never lands on a sheet of a game that's gone.
 */
export function go(id: GameId | null) {
  const open = (history.state as { kf?: unknown } | null)?.kf;
  if (typeof open === 'number' && open > 0) {
    pending = { id };
    history.go(-open);
    return;
  }
  push(id);
}

export const currentGame = () => current;

/** The game the address names, live across go() and system Back. */
export function useGame(): GameId | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
  );
}
