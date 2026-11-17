import { preloadable, preloadAll } from '@/lib/preloadable';
import { isBig } from '@/theme/breakpoints';
import type { BoardProps } from './screens/board/Board';
import { gameInSearch } from './state/gameLink';

// Ishaara's chunks, made once, so one warmed ahead renders without a fallback. Only tablets and desktops download
// the large-screen board; the phone shell is in the game's first chunk.
export const DeskBoard = preloadable(() => import('./screens/desk/DeskBoard'));
export const Board = preloadable<BoardProps>(() =>
  import('./screens/board/Board').then((x) => ({ default: x.Board })),
);
export const Setup = preloadable(() => import('./screens/setup/Setup'));
export const Waiting = preloadable(() => import('./screens/Waiting'));
export const Win = preloadable(() => import('./screens/Win'));
export const ClueHome = preloadable(() => import('./screens/clue/ClueHome'));
export const HubPage = preloadable(() => import('./screens/pages/HubPage'));

/** Everything the first screen at `search` needs, fetched together, before the platform shows the game. */
export function prepare(search: string) {
  const big = isBig();
  return preloadAll(
    ...(big ? [DeskBoard] : []),
    // A game link opens on its waiting screen or its board.
    ...(gameInSearch(search) ? [Waiting, ...(big ? [] : [Board])] : []),
  );
}

/** What a player opens next from Home, warmed once idle. */
export const warmNext = () => preloadAll(Setup, HubPage, Waiting);
