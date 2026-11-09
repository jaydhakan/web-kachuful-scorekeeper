import type { Call, CardRef, CountedBy, KtGame, KtHand, KtLength, KtPhase, Suit } from '../types';

/** Builds Kaali Teeri games for tests and the backend's golden fixtures. Not used by the app. */

/** One auction call by seat: a bid amount, 'pass', or 'forced' (taken at the minimum). */
export type KitCall = [seat: number, what: number | 'pass' | 'forced'];

export interface KitHand {
  bidder: number;
  bid: number;
  /** The bidding team's points; omitted for a hand still in play. */
  team?: number;
  /** Which side's points the table entered (default: defenders). */
  countedBy?: CountedBy;
  trump?: Suit;
  /** Defaults to Ace, King, Queen, Jack of spades (first played with two decks), as many as the table calls. */
  called?: CardRef[];
  /** Seat per called card; defaults to the seats after the bidder, one each. */
  playedBy?: (number | null)[];
  /** The full auction; omitted means quick mode. */
  calls?: KitCall[];
  phase?: KtPhase;
  /** Minutes after the game started; defaults to 5 per hand. */
  at?: number;
}

export interface KitGame {
  id: string;
  /** Registry ids per seat; names follow them. */
  players: string[];
  hands: KitHand[];
  start: number;
  firstDealer?: number;
  direction?: 'cw' | 'ccw';
  length?: KtLength;
  minBid?: number;
  step?: 5 | 10;
  finished?: boolean;
}

const COL = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#22d3ee'];
const MIN = 60e3;
const DEFAULT_CALLED = ['A', 'K', 'Q', 'J'] as const;

export function kitGame(k: KitGame): KtGame {
  const n = k.players.length,
    decks: 1 | 2 = n <= 6 ? 1 : 2,
    partners = Math.floor(n / 2) - 1;
  const ids = k.players.map((_, i) => 'p' + i);
  const fd = k.firstDealer ?? 0;
  const hands: KtHand[] = k.hands.map((h, i) => {
    const phase = h.phase ?? 'done';
    const called =
      h.called ??
      DEFAULT_CALLED.slice(0, partners).map((rank): CardRef => ({
        rank,
        suit: 'spades',
        ...(decks === 2 && { copy: 1 as const }),
      }));
    const seats = h.playedBy ?? called.map((_, j) => (h.bidder + 1 + j) % n);
    const first = (fd + i + 1) % n;
    const calls: Call[] = (h.calls ?? []).map(([s, w]) => {
      const playerId = ids[(first + s) % n];
      return w === 'pass'
        ? { playerId, pass: true }
        : w === 'forced'
          ? { playerId, forced: h.bid }
          : { playerId, bid: w };
    });
    return {
      index: i,
      dealerIndex: (fd + i) % n,
      phase,
      mode: h.calls ? 'auction' : 'quick',
      calls,
      bidder: ids[h.bidder],
      bid: h.bid,
      trump: h.trump ?? 'hearts',
      called,
      playedBy: seats.map((s) => (s == null ? null : ids[s])),
      teamPoints: h.team ?? null,
      countedBy: h.team == null ? null : (h.countedBy ?? 'defenders'),
      ...(phase === 'done' && { doneAt: k.start + (h.at ?? (i + 1) * 5) * MIN }),
    };
  });
  const last = hands.reduce((t, h) => Math.max(t, h.doneAt ?? 0), k.start);
  return {
    kind: 'kaali-teeri',
    schemaVersion: 1,
    id: 'kt-' + k.id,
    syncId: k.id,
    rev: 1,
    createdAt: k.start,
    updatedAt: last + (k.finished ? MIN : 0),
    ...(k.finished && { finishedAt: last + MIN }),
    players: k.players.map((pid, i) => ({
      id: ids[i],
      playerId: pid,
      name: pid.slice(0, 14),
      emoji: '🙂',
      color: COL[i % COL.length],
    })),
    firstDealerIndex: fd,
    direction: k.direction ?? 'cw',
    rules: {
      decks,
      partners,
      minBid: k.minBid ?? (decks === 1 ? 150 : 350),
      step: k.step ?? 5,
      length: k.length ?? 'endless',
    },
    hands,
    status: k.finished ? 'finished' : 'active',
    ui: { view: 'hand' },
  };
}

/** mulberry32: a small seeded generator, so property tests replay the same cases every run. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const T0 = Date.UTC(2026, 10, 1, 13, 30);
