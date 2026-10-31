import {
  bidOrder,
  blockedReason,
  curRound,
  forbiddenFor,
  resultsState,
  sumBids,
  tricksLeft,
  type Blocked,
  type Game,
  type Outcome,
} from '@/domain';
import { t } from '@/strings';

/** Everything the bidding screens read off the current round; phone and large screen share it. */
export function bidView(g: Game) {
  const r = curRound(g),
    n = g.players.length,
    od = bidOrder(g, r);
  const bi = Math.min(g.ui.bidIdx, n - 1),
    pI = od[bi],
    p = g.players[pI],
    isD = pI === r.dealerIndex;
  const sum = sumBids(r);
  return {
    r,
    n,
    od,
    bi,
    pI,
    p,
    isD,
    allBid: g.players.every((q) => r.bids[q.id] !== undefined),
    forb: isD ? forbiddenFor(g, r) : null,
    hookWarn: !!g.ui.hookWarn,
    sum,
    cnt: Object.keys(r.bids).length,
    diff: sum - r.cards,
    dealer: g.players[r.dealerIndex],
    cap: isD ? t.bidding.dealerLast : bi === 0 ? t.bidding.first : t.bidding.nth(bi + 1, n),
  };
}

/** The results screens' view of the current round: the check, tricks left and why a choice is greyed out. */
export function resultsView(g: Game) {
  const r = curRound(g),
    tricks = r.tricks,
    ids = g.players.map((p) => p.id);
  // Only in the Made/Missed mode: with exact tricks the results follow from the counts.
  const blocked = (id: string, c: Outcome) =>
    tricks ? null : blockedReason(r.cards, ids, r.bids, r.results, id, c);
  const why = (b: Blocked | null) =>
    b ? (b.kind === 'left' ? t.results.onlyLeft(b.left) : t.results.noFit) : undefined;
  return {
    r,
    st: resultsState(g, r),
    od: bidOrder(g, r),
    tricks,
    ids,
    left: Math.max(0, tricksLeft(r.cards, r.bids, r.results)),
    blocked,
    why,
  };
}
