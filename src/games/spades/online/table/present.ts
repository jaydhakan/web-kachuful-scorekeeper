import { BAG_LIMIT, BAG_PENALTY, scoreHand, type TeamScore } from '@/games/spades/domain/scoring';
import { SEATS, seatsOf, teamOf } from '@/games/spades/domain/seats';
import { totals, type Totals } from '@/games/spades/domain/standings';
import { lastTrick } from '@/games/spades/domain/rules';
import type { Seat, SpHand, SpPublic, TeamId, TrickRec } from '@/games/spades/domain/types';
import type { NilState } from '@/games/spades/ui/Seat';
import { handDone } from './moments';

/** One team's live numbers on the bar: derived from the view and how many tricks the table has gathered so far. */
export interface TeamNumbers {
  score: number;
  contract: number | null;
  doubleNil: boolean;
  took: number;
  /** Every bag this game, including this hand's so far. */
  bagsTotal: number;
  /** 10-bag penalties this hand has triggered so far (shown the moment they happen). */
  bursts: number;
  made: boolean;
}

/** Tricks each seat took among the first `n` tricks. */
export function wonBy(tricks: readonly TrickRec[], n = tricks.length): number[] {
  const won = [0, 0, 0, 0];
  for (const t of tricks.slice(0, n)) won[t.winner]++;
  return won;
}

/**
 * The bar's numbers. `shown` is how many of this hand's tricks the table has gathered (a trick still on the felt
 * isn't counted yet). `settled`: the hand's summary is out, so the finished hand counts in the totals instead.
 */
export function teamNumbers(
  t: SpPublic,
  shown: number,
  settled: boolean,
): Record<TeamId, TeamNumbers> {
  const done = handDone(t);
  const live = !(done && settled);
  const base: SpHand[] = done && !settled ? t.history.slice(0, -1) : t.history;
  const before: Totals = totals(base);
  const won = wonBy(t.tricks, Math.min(shown, t.tricks.length));
  const one = (team: TeamId): TeamNumbers => {
    const b = before[team];
    if (!live || t.status === 'lobby') {
      return {
        score: b.score,
        contract: null,
        doubleNil: false,
        took: 0,
        bagsTotal: b.bags,
        bursts: 0,
        made: false,
      };
    }
    const seats = seatsOf(team);
    const allBid = seats.every((s) => t.bids[s] !== null && t.bids[s] !== undefined);
    let contract = 0,
      took = 0,
      nilTook = 0,
      bidders = 0;
    for (const s of seats) {
      if (t.bids[s] === 0) nilTook += won[s];
      else {
        took += won[s];
        if (t.bids[s] !== null) {
          bidders++;
          contract += t.bids[s] as number;
        }
      }
    }
    const over = allBid && bidders && took > contract ? took - contract : 0;
    const bagsTotal = b.bags + nilTook + over;
    const bursts = Math.floor(bagsTotal / BAG_LIMIT) - Math.floor(b.bags / BAG_LIMIT);
    return {
      score: b.score - BAG_PENALTY * bursts,
      contract: allBid ? contract : null,
      doubleNil: allBid && bidders === 0,
      took,
      bagsTotal,
      bursts,
      made: allBid && bidders > 0 && took >= contract,
    };
  };
  return { a: one('a'), b: one('b') };
}

/** A Nil bidder's halo: held until their first trick; made once the hand is over and they took none. */
export function nilState(t: SpPublic, seat: Seat, shown: number, ended: boolean): NilState {
  if (t.bids[seat] !== 0) return 'none';
  const won = wonBy(t.tricks, Math.min(shown, t.tricks.length))[seat];
  if (won > 0) return 'broken';
  return ended && handDone(t) ? 'made' : 'live';
}

/** The finished hand's score for each team, with the bags carried into it. */
export function lastHandScore(t: SpPublic): Record<TeamId, TeamScore> | null {
  const h = t.history[t.history.length - 1];
  if (!h) return null;
  const prior = totals(t.history.slice(0, -1));
  return scoreHand(h, { a: prior.a.bags, b: prior.b.bags });
}

/** Cards each seat still holds: 13 less what it has played this deal. */
export function cardsLeft(t: SpPublic): number[] {
  if (t.phase !== 'bidding' && t.phase !== 'playing') return [0, 0, 0, 0];
  const played = [0, 0, 0, 0];
  for (const x of t.tricks) for (const p of x.plays) played[p.seat]++;
  for (const p of t.trick) played[p.seat]++;
  return played.map((n) => 13 - n);
}

/** The seat a viewer sees in each place: 0 at the bottom, then clockwise (left, top, right). */
export const placeOf = (seat: Seat, me: Seat): 0 | 1 | 2 | 3 =>
  ((seat - me + 4) % 4) as 0 | 1 | 2 | 3;

export const teamName = (
  team: TeamId,
  me: Seat | null,
  names: readonly string[],
  s: { us: string; them: string; pair: (a: string, b: string) => string },
) => {
  if (me === null) {
    const [p, q] = seatsOf(team);
    return s.pair(names[p], names[q]);
  }
  return teamOf(me) === team ? s.us : s.them;
};

export { lastTrick, SEATS };
