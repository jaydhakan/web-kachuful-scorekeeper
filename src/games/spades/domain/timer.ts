import { minBidFor } from './bidding';
import { lowestCard } from './cards';
import { legalPlays } from './legal';
import type { Card, Play, Seat, SpPublic, SpRules } from './types';

/** The timer an away seat plays on. */
export const AWAY_TIMER_MS = 5000;
/** Timeouts in a row that mark a seat away. */
export const AWAY_AFTER = 2;
/** With the timer off, a seat unseen this long plays as a timeout would (D14a). */
export const ABSENT_MS = 60_000;
/** After this long in 'deal' or 'handEnd', anyone seated may deal. */
export const DEAL_ANYONE_MS = 15_000;

type TimerState = Pick<
  SpPublic,
  'status' | 'paused' | 'phase' | 'turn' | 'turnStartedAt' | 'seats' | 'rules'
>;

/** Whether there is a bid or play that a timeout could make for the seat to act. */
export function timedTurn(s: TimerState): boolean {
  return (
    s.status === 'playing' &&
    s.paused === null &&
    (s.phase === 'bidding' || s.phase === 'playing') &&
    s.turn !== null &&
    s.turnStartedAt !== null
  );
}

/**
 * When the turn may be timed out: the away timer, else the rules' timer, else (timer off) 60 s after the later of
 * the turn's start and when the seat was last seen. Without `lastSeenAt` the last case is null.
 */
export function deadlineFor(s: TimerState, lastSeenAt?: number | null): number | null {
  if (!timedTurn(s)) return null;
  const start = s.turnStartedAt as number;
  if (s.seats[s.turn as Seat].away) return start + AWAY_TIMER_MS;
  if (s.rules.timerSec !== null) return start + s.rules.timerSec * 1000;
  if (lastSeenAt === undefined || lastSeenAt === null) return null;
  return Math.max(start, lastSeenAt) + ABSENT_MS;
}

/** The lowest bid the rules allow that isn't Nil. */
export const timeoutBid = (seat: Seat, bids: readonly (number | null)[], r: SpRules) =>
  minBidFor(seat, bids, r);

/** The lowest legal card. */
export const timeoutPlay = (hand: readonly Card[], trick: readonly Play[], broken: boolean): Card =>
  lowestCard(legalPlays(hand, trick, broken));
