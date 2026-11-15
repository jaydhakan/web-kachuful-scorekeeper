import { useSyncExternalStore } from 'react';
import { parseOnlineEntry, type OnlineEntry } from './online/entry';

/** The pages table mode opens straight to from Home (`?keep&page=history`). */
export type TablePage = 'history' | 'leaderboard';

/** What `/spades` shows for an address: Home, table mode (`?keep`), or online play. */
export type SpView =
  | { kind: 'home' }
  | { kind: 'table'; page: TablePage | null }
  | { kind: 'online'; entry: OnlineEntry };

const PAGES: readonly string[] = ['history', 'leaderboard'];

export function viewOf(search: string): SpView {
  const q = new URLSearchParams(search);
  if (q.has('keep')) {
    const page = q.get('page');
    return { kind: 'table', page: page && PAGES.includes(page) ? (page as TablePage) : null };
  }
  const entry = parseOnlineEntry(search);
  return entry ? { kind: 'online', entry } : { kind: 'home' };
}

const subs = new Set<() => void>();
const tell = () => subs.forEach((f) => f());

function subscribe(f: () => void) {
  if (!subs.size) addEventListener('popstate', tell);
  subs.add(f);
  return () => {
    subs.delete(f);
    if (!subs.size) removeEventListener('popstate', tell);
  };
}

/** The address's search part, live across spGo() and system Back. */
export const useSpadesSearch = () => useSyncExternalStore(subscribe, () => location.search);

/**
 * Moves within `/spades` (`spGo('?keep')`, `spGo('')` for Home). A new history entry, so system Back returns; with
 * `replace`, the current one changes instead (a joined code becoming its table, say).
 */
export function spGo(search: string, { replace = false } = {}) {
  const url =
    '/spades' + (search && !search.startsWith('?') ? '?' + search : search) + location.hash;
  if (replace) history.replaceState(history.state, '', url);
  else history.pushState(null, '', url);
  tell();
}
