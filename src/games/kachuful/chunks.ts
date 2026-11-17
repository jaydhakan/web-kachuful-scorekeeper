import { preloadable, preloadAll } from '@/lib/preloadable';
import { KEYS, storage } from '@/state/persistence';
import { isBig } from '@/theme/breakpoints';

// Kachuful's chunks, each made once and shared by both UIs, so a chunk warmed ahead renders without a fallback.
export const PhoneShell = preloadable(() => import('./components/PhoneShell'));
export const DeskShell = preloadable(() => import('@/games/kachuful/screens/desk/DeskShell'));
export const Pages = preloadable(() => import('@/games/kachuful/screens/pages/Pages'));
export const Winner = preloadable(() => import('@/games/kachuful/screens/Winner'));
// A named export goes through .then(), which TypeScript can't infer the props through: typed here.
export const Setup = preloadable<object>(() =>
  import('@/games/kachuful/screens/setup/Setup').then((m) => ({ default: m.Setup })),
);
export const DeskSetup = preloadable<object>(() =>
  import('@/games/kachuful/screens/desk/DeskSetup').then((m) => ({ default: m.DeskSetup })),
);

// Addresses that open a page over the game (src/lib/entry.ts).
const PAGE_KEYS = ['open', 'invite', 'reset', 'live', 'recap'];

/** Everything the first screen at `search` needs, fetched together, before the platform shows the game. */
export function prepare(search: string) {
  const big = isBig();
  const q = new URLSearchParams(search);
  const saved = storage.get<string>(KEYS.screen, 'home');
  return preloadAll(
    big ? DeskShell : PhoneShell,
    ...(PAGE_KEYS.some((k) => q.has(k)) ? [Pages] : []),
    ...(saved === 'setup' ? [big ? DeskSetup : Setup] : []),
    ...(saved === 'winner' && !big ? [Winner] : []),
  );
}

/** What a player opens next, warmed once the game is idle so the first tap never waits. */
export const warmNext = (big: boolean) =>
  preloadAll(Pages, ...(big ? [DeskSetup] : [Setup, Winner]));
