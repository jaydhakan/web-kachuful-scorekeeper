import { preloadable, preloadAll } from '@/lib/preloadable';
import { signedInAs } from '@/sync/session';
import { isBig } from '@/theme/breakpoints';
import { viewOf } from './nav';
import { partOf } from './screens/LazyPart';

// Each mode is its own chunk: Home never downloads the scorekeeper or the online table until one is opened.
export const loadTable = () => import('./table/TableApp');
export const loadOnline = () => import('./online/OnlineApp');
// Only tablets and desktops download the scorekeeper's desk layout.
export const DeskShell = preloadable(() => import('./table/screens/desk/DeskShell'));
export const Setup = preloadable(() => import('./table/screens/setup/Setup'));
export const Winner = preloadable(() => import('./table/screens/Winner'));
export const Pages = preloadable(() => import('./table/screens/pages/Pages'));

/** Everything the first screen at `search` needs, fetched together, before the platform shows the game. */
export function prepare(search: string) {
  const view = viewOf(search);
  if (view.kind === 'table')
    return preloadAll(partOf(loadTable), ...(isBig() ? [DeskShell] : []));
  if (view.kind === 'online' && (signedInAs() || view.entry.kind === 'live' || view.entry.kind === 'recap'))
    return preloadAll(partOf(loadOnline));
  return Promise.resolve();
}

/** The scorekeeper, warmed from Home once idle: its button then opens it at once. */
export const warmTable = () => preloadAll(partOf(loadTable), ...(isBig() ? [DeskShell] : []));
/** What the scorekeeper opens next, warmed once it is idle. */
export const warmNext = () => preloadAll(Setup, Winner, Pages);
