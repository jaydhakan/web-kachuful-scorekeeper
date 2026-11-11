import { auction, dealerFor, speakingOrder, validBid } from './auction';
import { canAdd, validCalled, validPlayedBy } from './calls';
import { MAX_PLAYERS, MIN_PLAYERS, SUITS, deckTotal, rulesOk } from './cards';
import { TARGET, totals } from './scoring';
import type { KtGame, KtHand, KtPhase } from './types';

/** The server's `invalid_game` reasons. */
export type KtInvalidReason =
  | 'players'
  | 'rules'
  | 'dealer'
  | 'hands'
  | 'auction'
  | 'bid'
  | 'trump'
  | 'called'
  | 'played_by'
  | 'team_points'
  | 'times';

export interface KtInvalid {
  reason: KtInvalidReason;
  handIndex: number | null;
}

export const PHASES: readonly KtPhase[] = ['bidding', 'calling', 'playing', 'result', 'done'];
const NAME_MAX = 14;
const FIVE_MIN = 5 * 60e3,
  TEN_MIN = 10 * 60e3;

const bad = (reason: KtInvalidReason, handIndex: number | null = null): KtInvalid => ({
  reason,
  handIndex,
});

/** Whether a game would be accepted for upload, or the first thing wrong with it; `now` is the server's clock. */
export function validate(g: KtGame, now: number = Date.now()): KtInvalid | null {
  const n = g.players.length;
  const ids = g.players.map((p) => p.id);
  const pids = g.players.flatMap((p) => (p.playerId ? [p.playerId] : []));
  if (
    n < MIN_PLAYERS ||
    n > MAX_PLAYERS ||
    new Set(ids).size !== n ||
    new Set(pids).size !== pids.length ||
    g.players.some((p) => !p.name.trim() || p.name.length > NAME_MAX)
  )
    return bad('players');
  if (!rulesOk(g.rules, n)) return bad('rules');
  if (
    !Number.isInteger(g.firstDealerIndex) ||
    g.firstDealerIndex < 0 ||
    g.firstDealerIndex >= n ||
    (g.direction !== 'cw' && g.direction !== 'ccw')
  )
    return bad('dealer');

  const last = g.hands.length - 1;
  let over = -1;
  for (const [i, h] of g.hands.entries()) {
    if (h.dealerIndex !== dealerFor(g, i)) return bad('dealer', i);
    if (
      h.index !== i ||
      !PHASES.includes(h.phase) ||
      (i < last && h.phase !== 'done') ||
      (i === last && g.status === 'finished' && h.phase !== 'done') ||
      over >= 0
    )
      return bad('hands', i);
    if (h.phase === 'done' && g.rules.length === 'to1000') {
      const t = totals(g, g.hands.slice(0, i + 1));
      if (Object.values(t).some((x) => x >= TARGET)) over = i;
    }
  }

  for (const [i, h] of g.hands.entries()) {
    const why = handProblem(g, h, i, ids);
    if (why) return bad(why, i);
  }

  const times = [g.createdAt, g.updatedAt, g.finishedAt, ...g.hands.map((h) => h.doneAt)].filter(
    (t): t is number => t !== undefined,
  );
  if (times.some((t) => t > now + TEN_MIN)) return bad('times');
  const late = g.hands.find(
    (h) => h.doneAt !== undefined && (h.doneAt < g.createdAt || h.doneAt > g.updatedAt + FIVE_MIN),
  );
  if (late) return bad('times', late.index);
  return null;
}

/** What a hand's phase says must be filled in, and that what's there is legal. */
function handProblem(g: KtGame, h: KtHand, i: number, ids: string[]): KtInvalidReason | null {
  const n = ids.length,
    r = g.rules,
    at = PHASES.indexOf(h.phase);
  const CALLING = 1,
    PLAYING = 2,
    RESULT = 3,
    DONE = 4;

  if (h.mode !== 'quick' && h.mode !== 'auction') return 'auction';
  const auc = h.mode === 'auction' ? auction(h.calls, speakingOrder(g, i), r) : null;
  if (auc ? auc.invalidAt !== null || (at >= CALLING && !auc.done) : h.calls.length > 0)
    return 'auction';

  if (at < CALLING) {
    if (h.bidder !== null || h.bid !== null) return 'bid';
  } else if (
    h.bidder === null ||
    !ids.includes(h.bidder) ||
    h.bid === null ||
    !validBid(h.bid, r) ||
    (auc && (auc.holder !== h.bidder || auc.high !== h.bid))
  )
    return 'bid';

  if (
    at < PLAYING
      ? h.trump !== null && (at < CALLING || !SUITS.includes(h.trump))
      : !SUITS.includes(h.trump!)
  )
    return 'trump';

  if (
    at < CALLING
      ? h.called.length > 0
      : at === CALLING
        ? !h.called.every((c, k) => canAdd(c, h.called.slice(0, k), n))
        : !validCalled(h.called, n)
  )
    return 'called';

  if (!validPlayedBy(h, ids) || (at === DONE && h.playedBy.includes(null))) return 'played_by';

  const pts = h.teamPoints,
    by = h.countedBy;
  const ptsOk =
    pts !== null && Number.isInteger(pts) && pts % 5 === 0 && pts >= 0 && pts <= deckTotal(r.decks);
  const byOk = by === 'defenders' || by === 'bidders';
  if (
    at < RESULT
      ? pts !== null || by !== null
      : at === RESULT
        ? (pts !== null && !ptsOk) || (by !== null && !byOk)
        : !ptsOk || !byOk
  )
    return 'team_points';
  return null;
}
