import { useEffect, useState } from 'react';
import { ishEp } from '@/games/ishaara/sync/endpoints';
import type { IshaaraRole } from './store';

const PARAM = 'game';

/** The address that opens one game directly: the clue phone's gate, or the board on the host's device. */
export const gameLink = (id: string, origin = location.origin) =>
  `${origin}/ishaara?${PARAM}=${encodeURIComponent(id)}`;

/** The game an address names, if any. */
export const gameInSearch = (search: string) => new URLSearchParams(search).get(PARAM) || null;

/**
 * Opens the game in the address once, as whatever this account is in it (its key, else the table), then tidies the
 * address so a reload lands on Home. A game this account can't open leaves Home as it is.
 */
export function useGameLink(open: (id: string, role: IshaaraRole) => void) {
  // Read once at mount: the effect tidies the address, and may run twice (StrictMode).
  const [id] = useState(() => gameInSearch(location.search));
  useEffect(() => {
    if (!id) return;
    history.replaceState(history.state, '', location.pathname + location.hash);
    const ctl = new AbortController();
    ishEp
      .game(id, { signal: ctl.signal })
      .then((out) => open(id, out.me.team ? 'clue' : 'table'))
      .catch(() => {});
    return () => ctl.abort();
  }, [id, open]);
}
