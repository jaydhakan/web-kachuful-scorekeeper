import { preloadable, type Preloadable } from '@/lib/preloadable';
import { gameById } from './catalog';
import type { GameId } from './route';

export const Landing = preloadable(() => import('./landing/Landing'));

// One root per game, made once: going back and forth never re-suspends a game already loaded.
const roots = new Map<GameId, Preloadable<object>>();
export function rootOf(id: GameId): Preloadable<object> {
  let C = roots.get(id);
  if (!C) roots.set(id, (C = preloadable(gameById(id).load)));
  return C;
}

/**
 * Fetches everything a page's first screen at `search` needs, in parallel: the landing page, or a game's root and
 * whatever its `prepare` asks for. Never rejects: a chunk that can't be fetched shows on the page itself, with Retry.
 */
export function preparePage(id: GameId | null, search = ''): Promise<unknown> {
  if (!id) return Landing.preload().catch(() => {});
  return Promise.all([
    rootOf(id).preload(),
    gameById(id)
      .load()
      .then((m) => m.prepare(search)),
  ]).catch(() => {});
}
