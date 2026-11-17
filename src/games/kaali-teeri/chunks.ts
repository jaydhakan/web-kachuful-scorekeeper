import { preloadable, preloadAll } from '@/lib/preloadable';
import { KEYS, storage } from '@/state/persistence';
import { isBig } from '@/theme/breakpoints';

// Kaali Teeri's chunks, made once and shared by both UIs, so one warmed ahead renders without a fallback.
export const KtDeskShell = preloadable(() => import('./screens/desk/KtDeskShell'));
export const Viewer = preloadable(() => import('./screens/viewer/Viewer'));
export const Setup = preloadable(() => import('./screens/setup/Setup'));
export const Deal = preloadable(() => import('./screens/setup/Deal'));
export const Winner = preloadable(() => import('./screens/Winner'));
export const Pages = preloadable(() => import('./screens/pages/Pages'));

/** Everything the first screen at `search` needs, fetched together, before the platform shows the game. */
export function prepare(search: string) {
  const q = new URLSearchParams(search);
  const saved = storage.get<string>(KEYS.ktScreen, 'home');
  return preloadAll(
    ...(q.has('live') || q.has('recap') ? [Viewer] : []),
    ...(isBig() ? [KtDeskShell] : []),
    ...(saved === 'setup' ? [Setup] : saved === 'winner' ? [Winner] : []),
  );
}

/** What a player opens next, warmed once the game is idle so the first tap never waits. */
export const warmNext = () => preloadAll(Setup, Pages, Winner, Deal);
