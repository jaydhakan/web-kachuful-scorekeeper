import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react';
import {
  gameOfKind,
  knownBefore,
  notify,
  onClear,
  onSeatInvites,
  visibleInvites,
  type SeatInvite,
  type SeatInviteStatus,
} from './seatInvites';

/**
 * What the banner and the host need beyond the list: which invites were announced, when a game keeps the banner
 * away, where Join opens, and what invitees answered (`seat-invite-update`). Loaded only with lazy code, never by
 * the landing page.
 */

/** What the host hears about an invite they sent. */
export interface SeatInviteUpdate {
  id: string;
  status: SeatInviteStatus;
  gameId: string;
  seat: string;
}

let updates: SeatInviteUpdate[] = [];
/** Ids the banner has announced, or that sat on screen as a card: never announced (again). */
const told = new Set<string>();
let quiet = 0;
const cards = new Map<string, number>();
const joins = new Map<string, (inv: SeatInvite) => void>();

onClear(() => {
  told.clear();
  updates = [];
});

/** The host's side (`seat-invite-update`): the latest word on each invite they sent. */
export function putUpdate(u: SeatInviteUpdate) {
  updates = [...updates.filter((x) => x.id !== u.id), u];
  notify();
}

let updCache: { src: SeatInviteUpdate[]; id: string; out: SeatInviteUpdate[] } | null = null;
function updatesOf(gameId: string) {
  if (updCache?.src !== updates || updCache.id !== gameId)
    updCache = { src: updates, id: gameId, out: updates.filter((u) => u.gameId === gameId) };
  return updCache.out;
}

/** What the people invited to one game have said (the host's side), latest per invite. */
export function useSeatInviteUpdates(gameId: string): SeatInviteUpdate[] {
  return useSyncExternalStore(onSeatInvites, () => updatesOf(gameId));
}

/** The invite the banner should announce now, if any: new to this visit, not told yet, its game's cards not shown. */
export function bannerCandidate(): SeatInvite | null {
  if (quiet > 0) return null;
  return (
    visibleInvites().find(
      (i) => !told.has(i.id) && !knownBefore(i.id) && !cards.get(gameOfKind(i.kind)),
    ) ?? null
  );
}

/** Marks invites as announced, so neither a banner nor a refetch announces them again. */
export const markTold = (ids: string[]) => ids.forEach((id) => told.add(id));

/** Keeps the banner away while mounted and `on`: a game calls it during an online hand. The badge still counts. */
export function useQuietInvites(on = true) {
  useEffect(() => {
    if (!on) return;
    quiet++;
    notify();
    return () => {
      quiet--;
      notify();
    };
  }, [on]);
}

/** True while some game keeps invites quiet. */
export function useInvitesQuieted(): boolean {
  return useSyncExternalStore(onSeatInvites, () => quiet > 0);
}

/** A game's invite cards are on screen: its invites need no banner. Before paint, so the banner never flashes. */
export function useCardsShown(game: string) {
  useLayoutEffect(() => {
    cards.set(game, (cards.get(game) ?? 0) + 1);
    return () => void cards.set(game, (cards.get(game) ?? 1) - 1);
  }, [game]);
}

/** While a game is mounted, Join from anywhere (the banner) opens the invite in place instead of by address. */
export function useSeatInviteJoin(game: string, open: (inv: SeatInvite) => void) {
  useEffect(() => {
    joins.set(game, open);
    return () => {
      if (joins.get(game) === open) joins.delete(game);
    };
  }, [game, open]);
}
export const joinHandler = (game: string) => joins.get(game) ?? null;

/** Tests start from nothing. */
export function resetSignalsForTests() {
  told.clear();
  updates = [];
  quiet = 0;
  cards.clear();
  joins.clear();
}
