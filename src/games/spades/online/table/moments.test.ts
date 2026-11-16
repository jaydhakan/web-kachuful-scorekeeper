import { legalPlays } from '@/games/spades/domain/legal';
import { dealSeeded } from '@/games/spades/domain/cards';
import { scoreHand } from '@/games/spades/domain/scoring';
import type { Card, Seat } from '@/games/spades/domain/types';
import { card, ok, started, step, type Table } from '@/games/spades/domain/__fixtures__/kit';
import { dealNo, isCut, momentsBetween } from './moments';
import { cardsLeft, nilState, teamNumbers } from './present';

const bidAll = (t: Table, bids: number[]) => {
  for (const b of bids) t = ok(t, t.state.turn as Seat, { type: 'bid', bid: b });
  return t;
};
const playFirst = (t: Table) => {
  const seat = t.state.turn as Seat;
  const c = legalPlays((t.hands as Card[][])[seat], t.state.trick, t.state.broken)[0];
  return ok(t, seat, { type: 'play', card: c });
};

describe('momentsBetween', () => {
  it('names the deal, each bid and each play in order', () => {
    const t0 = started({ deal: dealSeeded(7) });
    expect(dealNo(t0.state)).toBe(1);
    const t1 = ok(t0, t0.state.turn as Seat, { type: 'bid', bid: 3 });
    expect(momentsBetween(t0.state, t1.state)).toEqual([
      { kind: 'bid', seat: 0, bid: 3, blind: false },
    ]);
    const t2 = bidAll(t1, [2, 4, 1]);
    const t3 = playFirst(t2);
    const ms = momentsBetween(t2.state, t3.state);
    expect(ms[0]).toMatchObject({ kind: 'play', seat: 0, index: 0, cut: false });
  });

  it('reports the trick and its winner with the fourth card', () => {
    let t = bidAll(started({ deal: dealSeeded(7) }), [3, 2, 4, 1]);
    for (let i = 0; i < 3; i++) t = playFirst(t);
    const last = playFirst(t);
    const ms = momentsBetween(t.state, last.state);
    expect(ms.map((m) => m.kind)).toEqual(expect.arrayContaining(['play', 'trick']));
    const trick = ms.find((m) => m.kind === 'trick');
    expect(trick).toEqual({ kind: 'trick', winner: last.state.tricks[0].winner, index: 0 });
  });

  it('sees a cut and the moment spades break', () => {
    expect(isCut([{ seat: 0, card: card('Kh') }], { seat: 1, card: card('2s') })).toBe(true);
    expect(isCut([{ seat: 0, card: card('Ks') }], { seat: 1, card: card('As') })).toBe(false);
    const t = bidAll(started(), [3, 3, 3, 3]);
    // With every spade in seat 0's hand, seat 0 may lead one (an all-spade hand), which breaks spades.
    const after = ok(t, 0, { type: 'play', card: card('2s') });
    expect(momentsBetween(t.state, after.state)).toContainEqual({ kind: 'broken', seat: 0 });
  });

  it('marks a timeout with what it chose, and ignores an older or equal view', () => {
    const t = started({ deal: dealSeeded(3) });
    const late = step(t, null, { type: 'timeout' }, { rev: t.state.rev }, 31_000);
    const r = step(t, 0, { type: 'timeout' }, { rev: t.state.rev }, 31_000);
    expect(late.res.ok).toBe(false);
    const ms = momentsBetween(t.state, r.state);
    expect(ms).toContainEqual({ kind: 'timeout', seat: 0, bid: 1, card: null });
    expect(momentsBetween(r.state, t.state)).toEqual([]);
  });
});

describe('teamNumbers', () => {
  it('counts only the tricks the table has gathered, and the bags and bursts as they land', () => {
    let t = bidAll(started({ deal: dealSeeded(11) }), [1, 1, 1, 1]);
    for (let i = 0; i < 8; i++) t = playFirst(t);
    const shown = teamNumbers(t.state, 1, false);
    const all = teamNumbers(t.state, 2, false);
    expect(shown.a.took + shown.b.took).toBe(1);
    expect(all.a.took + all.b.took).toBe(2);
    expect(shown.a.contract).toBe(2);
    expect(cardsLeft(t.state)).toEqual([11, 11, 11, 11]);
  });

  it('after the hand, matches the scorer once settled', () => {
    let t = bidAll(started({ deal: dealSeeded(5) }), [0, 2, 3, 3]);
    while (t.state.phase === 'playing') t = playFirst(t);
    const h = t.state.history[0];
    const res = scoreHand(h);
    const settled = teamNumbers(t.state, 13, true);
    expect(settled.a.score).toBe(res.a.net);
    expect(settled.b.score).toBe(res.b.net);
    const nil = nilState(t.state, 0, 13, true);
    expect(nil).toBe(h.nilTricks[0] === 0 ? 'made' : 'broken');
  });
});
