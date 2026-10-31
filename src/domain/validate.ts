import { maxFor, playerCounts, TRUMPS, cardsFor } from './cards';
import { doneRounds, totalRounds } from './rounds';
import { standings } from './standings';
import { fits } from './tricks';
import type { Game } from './types';

/** The server's `invalid_game` reasons (plan-backend §7.2). */
export type InvalidReason =
  'players' | 'max_cards' | 'round_plan' | 'round_order' | 'bids' | 'results' | 'tricks' | 'times';

export type Validity = { ok: true } | { ok: false; reason: InvalidReason; roundIndex?: number };

const bad = (reason: InvalidReason, roundIndex?: number): Validity => ({
  ok: false,
  reason,
  ...(roundIndex !== undefined && { roundIndex }),
});

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** Whether a game would be accepted for upload; `now` is the server's clock. */
export function validate(g: Game, now: number = Date.now()): Validity {
  const n = g.players.length,
    decks = g.decks ?? 1;
  const ids = g.players.map((p) => p.id);
  const pids = g.players.map((p) => p.playerId).filter(Boolean);
  if (
    !playerCounts(decks).includes(n) ||
    new Set(ids).size !== n ||
    new Set(pids).size !== pids.length ||
    g.players.some((p) => !p.name.trim() || p.name.length > 14)
  )
    return bad('players');
  if (g.maxCards !== maxFor(n, decks)) return bad('max_cards');
  for (const [i, r] of g.rounds.entries()) {
    const d = (g.firstDealerIndex + i) % n;
    if (
      r.index !== i ||
      r.cards !== cardsFor(i, g.maxCards) ||
      r.trump !== TRUMPS[i % 4] ||
      r.dealerIndex !== d ||
      r.firstPlayerIndex !== (d + 1) % n
    )
      return bad('round_plan', i);
  }
  const last = g.rounds.length - 1;
  if (
    g.rounds.some((r, i) => i < last && r.phase !== 'done') ||
    g.rounds.length > totalRounds(g) ||
    (g.status === 'finished' && g.rounds[last]?.phase !== 'done')
  )
    return bad('round_order');
  for (const r of doneRounds(g)) {
    const bids = ids.map((id) => r.bids[id]);
    if (bids.some((b) => !isInt(b) || b < 0 || b > r.cards)) return bad('bids', r.index);
    if (bids.reduce((a, b) => a + b, 0) === r.cards) return bad('bids', r.index);
    const res = ids.map((id) => r.results[id]);
    if (res.some((x) => x !== 'made' && x !== 'missed')) return bad('results', r.index);
    if (r.tricks) {
      const tr = ids.map((id) => r.tricks![id]);
      if (
        tr.some((t) => !isInt(t) || t < 0 || t > r.cards) ||
        tr.reduce((a, b) => a + b, 0) !== r.cards ||
        ids.some((id) => (r.results[id] === 'made') !== (r.tricks![id] === r.bids[id]))
      )
        return bad('tricks', r.index);
    } else if (!fits(r.cards, ids, r.bids, r.results)) return bad('results', r.index);
  }
  const FIVE_MIN = 5 * 60e3,
    TEN_MIN = 10 * 60e3;
  const times = [g.createdAt, g.updatedAt, g.finishedAt, ...g.rounds.map((r) => r.doneAt)].filter(
    (t): t is number => t !== undefined,
  );
  if (
    times.some((t) => t > now + TEN_MIN) ||
    g.rounds.some(
      (r) =>
        r.doneAt !== undefined && (r.doneAt < g.createdAt || r.doneAt > g.updatedAt + FIVE_MIN),
    )
  )
    return bad('times');
  return { ok: true };
}

/** The contract's GameSummary player rows, from the game itself. */
export function summaryPlayers(g: Game, ended: boolean) {
  const st = standings(g);
  return g.players.map((p) => {
    const s = st.find((x) => x.p.id === p.id)!;
    return {
      playerId: p.playerId ?? null,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      points: s.t,
      place: ended ? s.rank : null,
    };
  });
}
