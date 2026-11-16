import { useSyncExternalStore } from 'react';

/** The games the site can host; the first path segment names one (`/kachuful`, `/kaali-teeri`). */
export type GameId = 'kachuful' | 'kaali-teeri' | 'ishaara' | 'spades';
export const GAME_IDS: readonly GameId[] = ['kachuful', 'kaali-teeri', 'ishaara', 'spades'];

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

/** Edit distance, for "did you mean" on a mistyped game path (`/kali-teeri`). */
function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++)
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

/** An address that names no page: what was asked for, and the game it most likely meant (or null). */
export interface Unknown {
  path: string;
  guess: GameId | null;
}

/** The game an unknown first segment is closest to, within two edits once dashes and case are ignored. */
export function guessGame(path: string): GameId | null {
  const seg = (path.split('/').find(Boolean) ?? '').toLowerCase().replace(/[^a-z]/g, '');
  if (!seg) return null;
  let best: [GameId | null, number] = [null, 3];
  for (const id of GAME_IDS) {
    const d = distance(seg, id.replace(/-/g, ''));
    if (d < best[1]) best = [id, d];
  }
  return best[0];
}

let unknown: Unknown | null = null;
/** The unknown address this visit started on: the landing page says so instead of appearing silently. */
export const unknownAddress = () => unknown;
/** Forgets it: dismissed, or the visitor has moved on to a page. */
export function clearUnknown() {
  unknown = null;
}

let current: GameId | null = null;
const subs = new Set<() => void>();
let pending: { id: GameId | null; search: string } | null = null;

function set(id: GameId | null) {
  if (id === current) return;
  current = id;
  subs.forEach((f) => f());
}

function push(id: GameId | null, search = '') {
  unknown = null;
  history.pushState(null, '', pathOf(id) + search);
  set(id);
}

function onPop() {
  if (pending) {
    const { id, search } = pending;
    pending = null;
    push(id, search);
    return;
  }
  set(gameFromPath(location.pathname));
}

/** Reads (and tidies) the address once, before the first render. */
export function startRoute() {
  const fix = entryPath(location.pathname, location.search);
  const asked = location.pathname;
  if (fix && asked !== '/' && !gameFromPath(asked))
    unknown = { path: asked, guess: guessGame(asked) };
  if (fix) history.replaceState(history.state, '', fix + location.hash);
  current = gameFromPath(location.pathname);
  window.removeEventListener('popstate', onPop);
  window.addEventListener('popstate', onPop);
}

/**
 * Opens a game, or the landing page with null. A game keeps one history entry per open sheet (`{ kf: n }`, see
 * useHistorySync); those go first, so system Back from the new page never lands on a sheet of a game that's gone.
 * `search` (`?open=account`) is read by the game when it mounts.
 */
export function go(id: GameId | null, search = '') {
  const open = (history.state as { kf?: unknown } | null)?.kf;
  if (typeof open === 'number' && open > 0) {
    pending = { id, search };
    history.go(-open);
    return;
  }
  push(id, search);
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
