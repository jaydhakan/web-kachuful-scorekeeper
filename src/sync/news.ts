import { useSyncExternalStore } from 'react';
import type { GameId } from '@/platform/route';
import type { GameStatus } from './types';

/**
 * What the server says moved (backend-requests §6, §7): crowns and bounties per game write, from the upload's
 * response on the table device and from the user stream on every other phone; and nights that just closed.
 */
export interface StatusNews extends GameStatus {
  game: GameId;
  gameId: string;
  /** From this device's own upload: its table already showed the takeover. */
  local: boolean;
  at: number;
}

interface News {
  status: StatusNews[];
  /** Nights closed while the app was open, newest first. */
  nights: string[];
}

const EMPTY: News = { status: [], nights: [] };
let cur: News = EMPTY;
const subs = new Set<() => void>();
const set = (next: News) => {
  cur = next;
  subs.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

/** Keeps the latest word per game: a later write replaces an earlier one. */
export function putStatus(n: StatusNews) {
  if (!n.changes.length && !n.bounties.length) return;
  set({ ...cur, status: [n, ...cur.status.filter((x) => x.gameId !== n.gameId)].slice(0, 20) });
}
export const dropStatus = (gameId: string) =>
  set({ ...cur, status: cur.status.filter((x) => x.gameId !== gameId) });
export function putNight(id: string) {
  if (!cur.nights.includes(id)) set({ ...cur, nights: [id, ...cur.nights].slice(0, 5) });
}
export const dropNight = (id: string) =>
  set({ ...cur, nights: cur.nights.filter((x) => x !== id) });
export const clearNews = () => set(EMPTY);

export const news = () => cur;
export const useNews = () => useSyncExternalStore(subscribe, news);
/** The server's word on one game, if any. */
export const useGameStatus = (gameId: string | null | undefined) =>
  useSyncExternalStore(subscribe, () =>
    gameId ? (cur.status.find((x) => x.gameId === gameId) ?? null) : null,
  );
