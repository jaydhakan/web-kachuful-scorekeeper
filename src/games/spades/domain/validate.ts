import { bidOrder, bidProblem, blindAllowed } from './bidding';
import { dealerFor, tricksOk } from './table';
import { endResult, gameOver, scoresOf, totals } from './standings';
import type { SpGame, SpHand, SpResult, SpRules } from './types';

/** The server's `invalid_game` reasons for a table-mode upload. */
export type SpInvalidReason =
  'players' | 'rules' | 'dealer' | 'hands' | 'bids' | 'tricks' | 'result' | 'times';

export interface SpInvalid {
  reason: SpInvalidReason;
  handIndex: number | null;
}

export const TARGET_MIN = 50;
export const TARGET_MAX = 1000;
export const PLAYER_NAME_MAX = 14;
const PHASES: readonly SpHand['phase'][] = ['bidding', 'tricks', 'done'];
const FIVE_MIN = 5 * 60e3,
  TEN_MIN = 10 * 60e3;

const bad = (reason: SpInvalidReason, handIndex: number | null = null): SpInvalid => ({
  reason,
  handIndex,
});

/** Rules a game may be played under: the choices Edit rules offers and nothing else. */
export function rulesOk(r: SpRules | null | undefined): boolean {
  if (!r || typeof r !== 'object') return false;
  const t = r.target;
  if (t !== null && !(Number.isInteger(t) && t >= TARGET_MIN && t <= TARGET_MAX && t % 10 === 0))
    return false;
  if (r.timerSec !== null && r.timerSec !== 30 && r.timerSec !== 60) return false;
  if (typeof r.nil !== 'boolean' || typeof r.blindNil !== 'boolean') return false;
  if (r.blindNil && !r.nil) return false;
  return (r.minTeamBid === null || r.minTeamBid === 4) && (r.mercy === null || r.mercy === -200);
}

const sameResult = (a: SpResult | undefined, b: SpResult | 'tie' | null) =>
  !!a && !!b && b !== 'tie' && a.winner === b.winner && a.endedBy === b.endedBy;

/** Whether a table-mode game would be accepted for upload, or the first thing wrong with it; `now` is the server's. */
export function validate(g: SpGame, now: number = Date.now()): SpInvalid | null {
  const ids = g.players?.map((p) => p.id) ?? [];
  const pids = (g.players ?? []).flatMap((p) => (p.playerId ? [p.playerId] : []));
  if (
    ids.length !== 4 ||
    new Set(ids).size !== 4 ||
    new Set(pids).size !== pids.length ||
    g.players.some(
      (p) => typeof p.name !== 'string' || !p.name.trim() || p.name.length > PLAYER_NAME_MAX,
    )
  )
    return bad('players');
  if (!rulesOk(g.rules)) return bad('rules');
  if (
    !Number.isInteger(g.firstDealerIndex) ||
    g.firstDealerIndex < 0 ||
    g.firstDealerIndex > 3 ||
    (g.direction !== 'cw' && g.direction !== 'ccw')
  )
    return bad('dealer');
  if (!['active', 'finished', 'cancelled'].includes(g.status)) return bad('result');

  const hands = Array.isArray(g.hands) ? g.hands : [];
  const last = hands.length - 1;
  const manual = g.result?.endedBy === 'end' || g.result?.endedBy === 'draw';
  for (const [i, h] of hands.entries()) {
    if (h.dealer !== dealerFor(g, i)) return bad('dealer', i);
    const open = h.phase !== 'done';
    if (
      h.index !== i ||
      !PHASES.includes(h.phase) ||
      (open && i < last) ||
      // Ending by hand drops the hand in progress, so it may stay unfinished.
      (open && g.status === 'finished' && !manual)
    )
      return bad('hands', i);
    // No hand after the one that decided the game.
    if (i < last && h.phase === 'done') {
      const over = gameOver(scoresOf(totals(hands.slice(0, i + 1))), g.rules);
      if (over && over !== 'tie') return bad('hands', i + 1);
    }
    const why = handProblem(h, g.rules);
    if (why) return bad(why, i);
  }

  const final = gameOver(scoresOf(totals(hands)), g.rules);
  if (g.status === 'finished') {
    const r = g.result;
    if (!r) return bad('result');
    const ok =
      r.endedBy === 'target' || r.endedBy === 'mercy'
        ? sameResult(r, final)
        : r.endedBy === 'end'
          ? sameResult(r, endResult(scoresOf(totals(hands)))) && !(final && final !== 'tie')
          : r.endedBy === 'draw' && r.winner === 'draw' && !(final && final !== 'tie');
    if (!ok) return bad('result');
  } else if (g.result !== undefined) return bad('result');

  const times = [g.createdAt, g.updatedAt, g.finishedAt, ...hands.map((h) => h.doneAt)].filter(
    (t): t is number => t !== undefined,
  );
  if (times.some((t) => typeof t !== 'number' || t > now + TEN_MIN)) return bad('times');
  if (g.updatedAt < g.createdAt) return bad('times');
  const late = hands.find(
    (h) => h.doneAt !== undefined && (h.doneAt < g.createdAt || h.doneAt > g.updatedAt + FIVE_MIN),
  );
  if (late) return bad('times', late.index);
  return null;
}

/** Bids made in turn order and legal under the rules; tricks present as far as the phase says. */
function handProblem(h: SpHand, r: SpRules): SpInvalidReason | null {
  if (!Array.isArray(h.bids) || h.bids.length !== 4) return 'bids';
  if (!Array.isArray(h.blind) || h.blind.length !== 4) return 'bids';
  const so: (number | null)[] = [null, null, null, null];
  let gap = false;
  for (const s of bidOrder(h.dealer)) {
    const b = h.bids[s];
    if (b === null) {
      gap = true;
      continue;
    }
    // A bid after an empty turn means bids were entered out of order.
    if (gap || bidProblem(b, s, so, r)) return 'bids';
    so[s] = b;
  }
  if (h.phase !== 'bidding' && gap) return 'bids';
  if (
    h.blind.some((x, s) => typeof x !== 'boolean' || (x && (h.bids[s] !== 0 || !blindAllowed(r))))
  )
    return 'bids';

  if (!Array.isArray(h.nilTricks) || h.nilTricks.length !== 4) return 'tricks';
  if (h.phase === 'bidding')
    return h.teamTricks === null && h.nilTricks.every((n) => n === null) ? null : 'tricks';
  if (h.phase === 'tricks' && h.teamTricks === null)
    return h.nilTricks.every((n) => n === null) ? null : 'tricks';
  return h.teamTricks && tricksOk(h, h.teamTricks, h.nilTricks) ? null : 'tricks';
}
