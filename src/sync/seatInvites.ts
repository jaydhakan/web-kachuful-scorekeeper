import { useSyncExternalStore } from 'react';

/**
 * Seat invites ("Jay invites you to seat X of game G"), as this page knows them. Eager and tiny on purpose: the
 * landing badge reads it on first paint. The banner's and host's signals are in `seatInviteSignals.ts`, and the
 * network side in `seatInvitesLive.ts`; both load later, and only signed in.
 */

export type SeatInviteKind = 'spades-online' | 'ishaara';
export type SeatInviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';

/** `SeatInviteOut` (backend-requests.md §1.3). */
export interface SeatInvite {
  id: string;
  kind: SeatInviteKind;
  gameId: string;
  /** `"0"`–`"3"` for Spades; `"clue:sun"` / `"clue:moon"` for Ishaara. */
  seat: string;
  status: SeatInviteStatus;
  createdAt: number;
  from: {
    userId: string;
    name: string;
    emoji: string;
    color: string;
    photoUrl: string | null;
  };
  table: { name: string; seatsTaken: number[] };
  partner: { name: string } | null;
}

/** A pending invite older than this is expired; the server only reports it on read, so the app hides it itself. */
export const INVITE_TTL_MS = 30 * 60_000;

/** The platform game (path) an invite kind belongs to. */
export const gameOfKind = (kind: SeatInviteKind): string =>
  kind === 'spades-online' ? 'spades' : kind;

let invites: SeatInvite[] = [];
/** serverNow − the device clock, from the last list or `hello`. */
let offset = 0;
/** Ids from before (or in) the first list: the badge and cards show those, the banner doesn't announce them. */
const known = new Set<string>();
let primed = false;

const subs = new Set<() => void>();
const clears = new Set<() => void>();
let byGame = new Map<string, SeatInvite[]>();
let visible: SeatInvite[] = [];
let expiry: ReturnType<typeof setTimeout> | undefined;
const EMPTY: SeatInvite[] = [];

/** The server's clock, as far as this page knows it. */
export const serverNow = () => Date.now() + offset;

// Derived once per change (and when the next invite expires), so every hook reads a stable snapshot.
function derive() {
  const at = serverNow();
  visible = invites
    .filter((i) => i.status === 'pending' && i.createdAt + INVITE_TTL_MS > at)
    .sort((a, b) => b.createdAt - a.createdAt);
  byGame = new Map();
  for (const i of visible) {
    const g = gameOfKind(i.kind);
    byGame.set(g, [...(byGame.get(g) ?? []), i]);
  }
  clearTimeout(expiry);
  const next = Math.min(...visible.map((i) => i.createdAt + INVITE_TTL_MS));
  if (Number.isFinite(next))
    expiry = setTimeout(notify, Math.min(Math.max(next - at, 0) + 50, 2 ** 31 - 1));
}

/** Re-derives and tells every subscriber (the signals module calls it when its own state changes). */
export function notify() {
  derive();
  subs.forEach((f) => f());
}

/** Subscribes outside React (the banner's scheduler, the signals module). */
export const onSeatInvites = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};

/** Pending invites still in time, newest first, and whether one was there before this visit's first list. */
export const visibleInvites = () => visible;
export const knownBefore = (id: string) => known.has(id);

/** A fresh list from `GET /api/seat-invites`: it replaces what was known. */
export function setInvites(items: SeatInvite[], now: number) {
  if (!primed) for (const i of items) known.add(i.id);
  primed = true;
  invites = items;
  offset = now - Date.now();
  notify();
}

/** `hello` carries the server's clock. */
export function setServerNow(now: number) {
  offset = now - Date.now();
  notify();
}

/** A new or changed invite (`seat-invite`). */
export function putInvite(inv: SeatInvite) {
  if (!primed) known.add(inv.id);
  invites = [...invites.filter((i) => i.id !== inv.id), inv];
  notify();
}

/** An invite answered, cancelled or expired (`seat-invite-gone`), or answered on this device. */
export function dropInvite(id: string) {
  if (!invites.some((i) => i.id === id)) return;
  invites = invites.filter((i) => i.id !== id);
  notify();
}

/** Run on sign-out with the rest (the signals module forgets what it was told). */
export const onClear = (f: () => void) => void clears.add(f);

/** Signed out (or another account): nothing of the old account's stays on the page. */
export function clearSeatInvites() {
  known.clear();
  primed = false;
  invites = [];
  clears.forEach((f) => f());
  notify();
}

/** Pending invites still in time, newest first; for one game (`'ishaara'`, `'spades'`) or all. */
export function useSeatInvites(game?: string): SeatInvite[] {
  return useSyncExternalStore(onSeatInvites, () => (game ? (byGame.get(game) ?? EMPTY) : visible));
}

/** How many invites wait for one game: the landing tile's badge. */
export function useSeatInviteCount(game: string): number {
  return useSyncExternalStore(onSeatInvites, () => byGame.get(game)?.length ?? 0);
}

/** Tests start from nothing. */
export function resetSeatInvitesForTests() {
  clearSeatInvites();
  offset = 0;
  notify();
}
