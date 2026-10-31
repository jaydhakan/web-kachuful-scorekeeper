import { maxFor } from '../cards';
import { newRound } from '../rounds';
import type { Game, LengthMode, Outcome } from '../types';

/** Builds valid games for tests and the backend's golden fixtures. Not used by the app. */

export interface KitRound {
  /** Per seat: made (true) or missed (false). At least one seat must miss. */
  made: boolean[];
  hookHits?: number;
  /** Minutes after the game started. */
  at?: number;
}

export interface KitGame {
  id: string;
  /** Registry ids per seat; names follow them unless `names` is given. */
  players: string[];
  names?: string[];
  rounds: KitRound[];
  start: number;
  finished?: boolean;
  /** Minutes after the last round; defaults to 1. */
  finishAfter?: number;
  firstDealer?: number;
  lengthMode?: LengthMode;
  decks?: 1 | 2;
}

const COL = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#22d3ee'];

/**
 * Made players bid the tricks they took; all tricks go to seat 0, so a missed seat bids one more than it took
 * (seat 0, holding every trick, bids fewer). The bids then never add up to the cards, as the dealer's hook needs.
 */
export function kitGame(k: KitGame): Game {
  const n = k.players.length,
    decks = k.decks ?? 1;
  const g: Game = {
    id: 'g-' + k.id,
    syncId: k.id,
    rev: 1,
    schemaVersion: 3,
    createdAt: k.start,
    updatedAt: k.start,
    players: k.players.map((pid, i) => ({
      id: 'p' + i,
      playerId: pid,
      name: k.names?.[i] ?? pid.replace(/^.*?:/, '').slice(0, 14),
      emoji: '🙂',
      color: COL[i % COL.length],
    })),
    direction: 'cw',
    firstDealerIndex: k.firstDealer ?? 0,
    decks,
    maxCards: maxFor(n, decks),
    lengthMode: k.lengthMode ?? 'endless',
    rounds: [],
    status: 'active',
    ui: { view: 'round', bidIdx: 0 },
  };
  k.rounds.forEach((kr, i) => {
    const r = newRound(g, i);
    const c = r.cards;
    const missedOthers = kr.made.slice(1).filter((m) => !m).length;
    kr.made.forEach((m, s) => {
      const id = g.players[s].id;
      const took = s === 0 ? c : 0;
      let bid = m ? took : s === 0 ? c - 1 : 1;
      if (s === 0 && !m && missedOthers === 1) bid = c - 2;
      r.bids[id] = bid;
      r.results[id] = (m ? 'made' : 'missed') as Outcome;
    });
    if (!kr.made.includes(false)) throw new Error(`round ${i}: someone has to miss`);
    r.hookHits = kr.hookHits ?? 0;
    r.phase = 'done';
    r.doneAt = k.start + (kr.at ?? i + 1) * 60e3;
    g.rounds.push(r);
  });
  const last = g.rounds.at(-1)?.doneAt ?? k.start;
  g.updatedAt = last;
  if (k.finished) {
    g.status = 'finished';
    g.finishedAt = last + (k.finishAfter ?? 1) * 60e3;
    g.updatedAt = g.finishedAt;
  } else {
    g.rounds.push(newRound(g, g.rounds.length));
  }
  return g;
}

/** Rounds where the seats in `winners` make it and everyone else misses. */
export const rows = (n: number, count: number, winners: number[] | ((i: number) => number[])) =>
  Array.from({ length: count }, (_, i) => {
    const w = typeof winners === 'function' ? winners(i) : winners;
    return { made: Array.from({ length: n }, (_, s) => w.includes(s)) };
  });
