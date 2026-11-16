import { isNil } from './scoring';
import { gameOver, scoresOf, totals, type Totals } from './standings';
import { TRICKS } from './cards';
import { seatsOf } from './seats';
import type { Seat, SpGame, SpHand, SpResult } from './types';

/** The dealer moves one seat clockwise each hand; `direction` never changes it. */
export const dealerFor = (g: Pick<SpGame, 'firstDealerIndex'>, index: number): Seat =>
  ((((g.firstDealerIndex + index) % 4) + 4) % 4) as Seat;

/** The next hand to bid. */
export function newHand(g: Pick<SpGame, 'firstDealerIndex' | 'hands'>): SpHand {
  const index = g.hands.length;
  return {
    index,
    dealer: dealerFor(g, index),
    bids: [null, null, null, null],
    blind: [false, false, false, false],
    teamTricks: null,
    nilTricks: [null, null, null, null],
    phase: 'bidding',
  };
}

const trickCount = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= TRICKS;

/**
 * Whether team a's tricks and the Nil bidders' tricks fit the bids: 0–13 each, a Nil bidder's tricks within the
 * team's, and with both partners Nil, theirs are all the team's.
 */
export function tricksOk(
  h: Pick<SpHand, 'bids'>,
  teamTricks: readonly number[],
  nilTricks: readonly (number | null)[],
): boolean {
  if (teamTricks.length !== 2 || !teamTricks.every(trickCount)) return false;
  if (teamTricks[0] + teamTricks[1] !== TRICKS || nilTricks.length !== 4) return false;
  return (['a', 'b'] as const).every((t, ti) => {
    const seats = seatsOf(t);
    const nils = seats.filter((s) => isNil(h, s));
    if (seats.some((s) => !isNil(h, s) && nilTricks[s] !== null)) return false;
    if (!nils.every((s) => trickCount(nilTricks[s]))) return false;
    const sum = nils.reduce<number>((n, s) => n + (nilTricks[s] as number), 0);
    return nils.length === 2 ? sum === teamTricks[ti] : sum <= teamTricks[ti];
  });
}

/** The tricks a Nil bidder can have taken, given team a's tricks and the other Nil partner's, if any. */
export function nilRange(
  h: Pick<SpHand, 'bids'>,
  seat: Seat,
  teamA: number,
  nilTricks: readonly (number | null)[],
): { min: number; max: number } {
  const team = seat % 2 === 0 ? teamA : TRICKS - teamA;
  const mate = ((seat + 2) % 4) as Seat;
  if (!isNil(h, mate)) return { min: 0, max: team };
  const other = nilTricks[mate];
  // Both Nil: they took all the team's tricks between them.
  return other === null ? { min: 0, max: team } : { min: team - other, max: team - other };
}

export interface TableEntry {
  index: number;
  dealer: Seat;
  bids: number[];
  blind?: boolean[];
  /** Team a's tricks; team b's are the rest of 13. */
  teamA: number;
  /** By seat, for Nil bidders only. */
  nilTricks?: (number | null)[];
  doneAt?: number;
}

/** A finished table-mode hand from what the scorer entered: bids, team a's tricks and each Nil bidder's. */
export function tableHand(e: TableEntry): SpHand {
  const nil = e.bids.map((b, s) => (b === 0 ? (e.nilTricks?.[s] ?? 0) : null));
  return {
    index: e.index,
    dealer: e.dealer,
    bids: e.bids.slice(),
    blind: e.bids.map((b, s) => b === 0 && !!e.blind?.[s]),
    teamTricks: [e.teamA, TRICKS - e.teamA],
    nilTricks: nil,
    phase: 'done',
    ...(e.doneAt !== undefined && { doneAt: e.doneAt }),
  };
}

export const gameTotals = (g: Pick<SpGame, 'hands'>): Totals => totals(g.hands);

/** Whether the finished hands end the game: a result, 'tie' (play another hand) or null. */
export const gameResult = (g: Pick<SpGame, 'hands' | 'rules'>): SpResult | 'tie' | null =>
  gameOver(scoresOf(gameTotals(g)), g.rules);
