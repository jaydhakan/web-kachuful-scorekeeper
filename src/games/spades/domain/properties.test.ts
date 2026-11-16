import { describe, expect, it } from 'vitest';
import { botMove, seeded } from './__fixtures__/bot';
import { T0, lobby, rulesWith, type Table } from './__fixtures__/kit';
import { cardId } from './cards';
import { legalPlays } from './legal';
import { applyAction } from './rules';
import { BAG_LIMIT, BAG_PENALTY } from './scoring';
import { handLines, totals } from './standings';
import { trickWinner } from './trick';
import { viewFor } from './view';
import type { Card, Seat, SpPublic, SpRules } from './types';

// Seeded random play (no property-testing library): each seed is one game, replayable from its number.
const RUNS = 120;

const rulesFor = (seed: number): SpRules =>
  rulesWith({
    target: [100, 200, 300, null][seed % 4],
    timerSec: ([30, 60, null] as const)[seed % 3],
    nil: seed % 7 !== 0,
    blindNil: seed % 7 !== 0 && seed % 2 === 0,
    minTeamBid: seed % 5 === 0 ? 4 : null,
    mercy: seed % 3 === 0 ? -200 : null,
  });

/** Cards a viewer must never see: everyone else's hand while it is still held. */
function leaks(s: SpPublic, hands: Card[][] | null, seat: Seat | null): string | null {
  if (!hands) return null;
  const { table, me } = viewFor(s, hands, seat, 0);
  const text = JSON.stringify({ ...table, drawn: null, trick: null, tricks: null, history: null });
  for (const x of [0, 1, 2, 3] as Seat[]) {
    if (x === seat) continue;
    for (const c of hands[x])
      if (text.includes(JSON.stringify(c))) return `seat ${x}'s ${cardId(c)}`;
  }
  if (me.hand && seat !== null && !s.looked[seat]) return 'a hand before looking';
  return null;
}

describe('random games', () => {
  // 120 whole games: fast alone, but slower than the default 5 s when the full suite runs in parallel.
  it('keep every invariant', { timeout: 30_000 }, () => {
    for (let seed = 1; seed <= RUNS; seed++) {
      const rnd = seeded(seed * 7919);
      let t: Table = { state: lobby(rulesFor(seed)), hands: null, now: T0 };
      let deals = 0;
      for (let n = 0; n < 3000 && t.state.status !== 'finished'; n++) {
        if (t.state.history.length >= 12 && t.state.phase === 'handEnd') break;
        const before = t;
        const m = botMove(t, rnd, seed, deals);
        const now = t.now + m.dt;
        const r = applyAction(t.state, m.action, m.actor, { now, hands: t.hands, ...m.ctx });
        const s = r.state;
        const ctx = `seed ${seed} move ${n} ${m.action.type} by ${m.actor}`;
        if (r.ok && m.action.type === 'deal' && !r.noop) deals++;

        // rev moves by exactly one on a change, never on a refusal or a no-op.
        expect(s.rev, ctx).toBe(before.state.rev + (r.ok && !r.noop ? 1 : 0));
        for (const v of [0, 1, 2, 3, null] as const) expect(leaks(s, r.hands, v), ctx).toBeNull();

        if (s.status === 'playing' && (s.phase === 'bidding' || s.phase === 'playing')) {
          const hands = r.hands as Card[][];
          // Every card is in exactly one place: a hand, the trick, or a finished trick.
          const seen = [...hands.flat(), ...s.trick.map((p) => p.card)];
          for (const tr of s.tricks) seen.push(...tr.plays.map((p) => p.card));
          expect(new Set(seen.map(cardId)).size, ctx).toBe(52);
          expect(seen, ctx).toHaveLength(52);
          // A legal play always exists for the seat to play.
          if (s.phase === 'playing') {
            const seat = s.turn as Seat;
            expect(legalPlays(hands[seat], s.trick, s.broken).length, ctx).toBeGreaterThan(0);
          }
          expect(s.turn, ctx).not.toBeNull();
        }
        t = { state: s, hands: r.hands, now };
      }

      for (const h of t.state.history) {
        const ctx = `seed ${seed} hand ${h.index}`;
        // 13 tricks, each with four different seats and one winner who played in it.
        expect(h.tricks, ctx).toHaveLength(13);
        expect((h.teamTricks as number[])[0] + (h.teamTricks as number[])[1], ctx).toBe(13);
        for (const tr of h.tricks ?? []) {
          expect(new Set(tr.plays.map((p) => p.seat)).size, ctx).toBe(4);
          expect(tr.winner, ctx).toBe(trickWinner(tr.plays));
        }
        for (const [i, tr] of (h.tricks ?? []).entries())
          if (i) expect(tr.plays[0].seat, ctx).toBe(h.tricks?.[i - 1].winner);
        expect(h.tricks?.[0].plays[0].seat, ctx).toBe((h.dealer + 1) % 4);
      }

      // The score is the hand points less 100 for every 10 bags, and the per-hand nets add up to it.
      const tot = totals(t.state.history);
      const lines = handLines(t.state.history);
      for (const team of ['a', 'b'] as const) {
        const points = lines.reduce((n, l) => n + l[team].points, 0);
        const bags = lines.reduce((n, l) => n + l[team].bags, 0);
        expect(tot[team].score, `seed ${seed}`).toBe(
          points - BAG_PENALTY * Math.floor(bags / BAG_LIMIT),
        );
        expect(lines.reduce((n, l) => n + l[team].net, 0)).toBe(tot[team].score);
        if (lines.length) expect(lines[lines.length - 1].after[team]).toBe(tot[team].score);
      }
    }
  });
});
