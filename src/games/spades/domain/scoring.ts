import { seatsOf } from './seats';
import type { Seat, SpHand, TeamId } from './types';

export const NIL_POINTS = 100;
export const BLIND_NIL_POINTS = 200;
export const BAG_LIMIT = 10;
export const BAG_PENALTY = 100;

export interface NilScore {
  seat: Seat;
  blind: boolean;
  made: boolean;
  tricks: number;
  points: number;
}

export interface TeamScore {
  team: TeamId;
  /** The bidding partners' bids added; a Nil partner is left out. */
  contract: number;
  /** Tricks toward the contract: the team's, less any Nil bidder's. */
  took: number;
  /** Null when both partners bid Nil. */
  made: boolean | null;
  /** This hand's points, before any 10-bag penalty. */
  points: number;
  /** Bags this hand: overtricks of a made contract plus every Nil bidder's tricks. */
  bags: number;
  nils: NilScore[];
  bagsBefore: number;
  bagsAfter: number;
  /** 10-bag penalties this hand triggered. */
  penalty: number;
  /** `points` less the penalties. */
  net: number;
}

export const isNil = (h: Pick<SpHand, 'bids'>, s: Seat) => h.bids[s] === 0;

/** Whether the hand has everything the scorer reads. */
export function scorable(h: SpHand): boolean {
  return (
    h.teamTricks !== null &&
    h.bids.every((b) => b !== null) &&
    h.bids.every((b, s) => b !== 0 || typeof h.nilTricks[s] === 'number')
  );
}

export function scoreTeam(h: SpHand, team: TeamId, bagsBefore = 0): TeamScore {
  const seats = seatsOf(team);
  const teamTricks = (h.teamTricks ?? [0, 0])[team === 'a' ? 0 : 1];
  const nils: NilScore[] = [];
  let contract = 0,
    nilTook = 0,
    bidders = 0;
  for (const s of seats) {
    if (isNil(h, s)) {
      const tricks = h.nilTricks[s] ?? 0;
      const value = h.blind[s] ? BLIND_NIL_POINTS : NIL_POINTS;
      nils.push({
        seat: s,
        blind: !!h.blind[s],
        made: tricks === 0,
        tricks,
        points: tricks === 0 ? value : -value,
      });
      nilTook += tricks;
    } else {
      bidders++;
      contract += h.bids[s] ?? 0;
    }
  }
  const took = teamTricks - nilTook;
  // A Nil bidder's tricks are always bags and never count toward the partner's contract.
  let points = nils.reduce((n, x) => n + x.points, 0) + nilTook;
  let bags = nilTook;
  let made: boolean | null = null;
  if (bidders) {
    made = took >= contract;
    if (made) {
      points += 10 * contract + (took - contract);
      bags += took - contract;
    } else points -= 10 * contract;
  }
  const bagsAfter = bagsBefore + bags;
  const penalty = Math.floor(bagsAfter / BAG_LIMIT) - Math.floor(bagsBefore / BAG_LIMIT);
  return {
    team,
    contract,
    took,
    made,
    points,
    bags,
    nils,
    bagsBefore,
    bagsAfter,
    penalty,
    net: points - BAG_PENALTY * penalty,
  };
}

export function scoreHand(
  h: SpHand,
  bagsBefore: Record<TeamId, number> = { a: 0, b: 0 },
): Record<TeamId, TeamScore> {
  return { a: scoreTeam(h, 'a', bagsBefore.a), b: scoreTeam(h, 'b', bagsBefore.b) };
}
