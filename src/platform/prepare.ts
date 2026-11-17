import { savingData, whenIdle } from '@/lib/idle';
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

/**
 * Link handlers that start fetching a page as soon as the visitor shows intent: a finger landing on it, a pointer
 * resting over it, or focus reaching it. By the time the tap ends the page is often ready.
 */
export const warmOn = (id: GameId | null, search = '') => {
  const warm = () => void preparePage(id, search);
  return { onPointerDown: warm, onPointerEnter: warm, onFocus: warm };
};

/** Once the page is idle, fetches each game's first screen in turn, so a tap on its tile opens it at once. */
export function warmGames(ids: readonly GameId[]): () => void {
  if (savingData()) return () => {};
  let stopped = false;
  const cancel = whenIdle(() => {
    void (async () => {
      for (const id of ids) {
        if (stopped) return;
        await preparePage(id);
      }
    })();
  });
  return () => {
    stopped = true;
    cancel();
  };
}
