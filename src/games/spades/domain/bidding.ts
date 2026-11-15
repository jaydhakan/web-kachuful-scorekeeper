import { SEATS, nextSeat, partnerOf } from './seats';
import type { Seat, SpRules } from './types';

export const MAX_BID = 13;
export type BidProblem = 'bad-bid' | 'nil-off' | 'below-min';

/** Bidding starts left of the dealer and goes clockwise; the dealer bids last. */
export function bidOrder(dealer: Seat): Seat[] {
  return SEATS.map((_, i) => ((dealer + 1 + i) % 4) as Seat);
}

export const firstToAct = (dealer: Seat) => nextSeat(dealer);
export const nilAllowed = (r: SpRules) => r.nil;
export const blindAllowed = (r: SpRules) => r.nil && r.blindNil;

/** The lowest bid other than Nil: the second partner may not take the team below the minimum unless one bid Nil. */
export function minBidFor(seat: Seat, bids: readonly (number | null)[], r: SpRules): number {
  const p = bids[partnerOf(seat)];
  if (r.minTeamBid === null || p === null || p === undefined || p === 0) return 1;
  return Math.max(1, r.minTeamBid - p);
}

export function bidProblem(
  bid: unknown,
  seat: Seat,
  bids: readonly (number | null)[],
  r: SpRules,
): BidProblem | null {
  if (typeof bid !== 'number' || !Number.isInteger(bid) || bid < 0 || bid > MAX_BID)
    return 'bad-bid';
  if (bid === 0) return r.nil ? null : 'nil-off';
  return bid < minBidFor(seat, bids, r) ? 'below-min' : null;
}

/** Every bid the seat may make, Nil (0) first when allowed. */
export function allowedBids(seat: Seat, bids: readonly (number | null)[], r: SpRules): number[] {
  const out = r.nil ? [0] : [];
  for (let b = minBidFor(seat, bids, r); b <= MAX_BID; b++) out.push(b);
  return out;
}
