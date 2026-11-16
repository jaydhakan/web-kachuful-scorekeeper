import { trickWinner, ledSuit } from '@/games/spades/domain/trick';
import { SEATS } from '@/games/spades/domain/seats';
import type { Card, Play, Seat, SpPublic } from '@/games/spades/domain/types';

/**
 * What happened between two consecutive views of the table, in the order it happened, so the table can play the
 * matching moment. Pure: the screen derives everything it animates from here, never from timers of its own.
 */
export type Moment =
  | { kind: 'deal'; dealer: Seat }
  | { kind: 'bid'; seat: Seat; bid: number; blind: boolean }
  | { kind: 'play'; seat: Seat; card: Card; cut: boolean; index: number }
  | { kind: 'broken'; seat: Seat }
  | { kind: 'trick'; winner: Seat; index: number }
  | { kind: 'timeout'; seat: Seat; bid: number | null; card: Card | null }
  | { kind: 'handEnd'; index: number }
  | { kind: 'finished' }
  | { kind: 'replaced'; seat: Seat }
  | { kind: 'resumed' };

const inHand = (t: SpPublic) =>
  t.status === 'playing' && (t.phase === 'bidding' || t.phase === 'playing');

/** Deals made so far: the finished hands, plus the one in progress. Constant from a deal until the next deal. */
export const dealNo = (t: SpPublic) => t.history.length + (inHand(t) ? 1 : 0);

/** Whether the table still shows the last finished hand (its 13 tricks are on record and nothing is dealt yet). */
export const handDone = (t: SpPublic) => t.history.length > 0 && t.tricks.length === 13;

/** Every card played this deal, in order. */
export const playsOf = (t: SpPublic): Play[] => [...t.tricks.flatMap((x) => x.plays), ...t.trick];

/** Whether `play` won its trick so far by cutting: a spade on a trick led in another suit. */
export function isCut(before: readonly Play[], play: Play): boolean {
  const led = ledSuit(before);
  if (led === null || led === 'spades' || play.card.suit !== 'spades') return false;
  return trickWinner([...before, play]) === play.seat;
}

export function momentsBetween(prev: SpPublic, next: SpPublic): Moment[] {
  if (next.id !== prev.id || next.rev <= prev.rev) return [];
  const out: Moment[] = [];
  const a = dealNo(prev),
    b = dealNo(next);
  if (b === a + 1 && next.phase === 'bidding' && next.status === 'playing') {
    out.push({ kind: 'deal', dealer: next.dealer as Seat });
  } else if (a === b && prev.status !== 'lobby') {
    for (const s of SEATS)
      if (prev.bids[s] === null && next.bids[s] !== null && next.bids[s] !== undefined)
        out.push({ kind: 'bid', seat: s, bid: next.bids[s] as number, blind: !!next.blind[s] });
    const was = playsOf(prev),
      now = playsOf(next);
    if (now.length > was.length) {
      for (let i = was.length; i < now.length; i++) {
        const p = now[i];
        const start = i - (i % 4);
        const before = now.slice(start, i);
        out.push({ kind: 'play', seat: p.seat, card: p.card, cut: isCut(before, p), index: i });
        if (!prev.broken && p.card.suit === 'spades' && !out.some((m) => m.kind === 'broken'))
          out.push({ kind: 'broken', seat: p.seat });
        if (i % 4 === 3) {
          const k = (i - 3) / 4;
          const rec = next.tricks[k];
          if (rec) out.push({ kind: 'trick', winner: rec.winner, index: k });
        }
      }
    }
    if (next.history.length > prev.history.length)
      out.push({ kind: 'handEnd', index: next.history.length - 1 });
  }
  for (const s of SEATS) {
    if (next.seats[s].timeouts <= prev.seats[s].timeouts) continue;
    const bid = out.find((m) => m.kind === 'bid' && m.seat === s);
    const play = out.find((m) => m.kind === 'play' && m.seat === s);
    out.push({
      kind: 'timeout',
      seat: s,
      bid: bid?.kind === 'bid' ? bid.bid : null,
      card: play?.kind === 'play' ? play.card : null,
    });
  }
  if (prev.paused === null && next.paused === 'replace') {
    const seat = SEATS.find((s) => prev.seats[s].who && !next.seats[s].who);
    if (seat !== undefined) out.push({ kind: 'replaced', seat });
  }
  if (prev.paused === 'replace' && next.paused === null) out.push({ kind: 'resumed' });
  if (prev.status !== 'finished' && next.status === 'finished') out.push({ kind: 'finished' });
  return out;
}
