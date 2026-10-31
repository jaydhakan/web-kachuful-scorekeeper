import { describe, expect, it } from 'vitest';
import { maxFor, newRound, type Game } from './index';
import { currentStreaks, streakMilestones, streakTier } from './streaks';

const mkGame = (n: number): Game => ({
  id: 'g',
  syncId: 'g',
  rev: 1,
  createdAt: 0,
  updatedAt: 0,
  players: Array.from({ length: n }, (_, i) => ({
    id: 'p' + i,
    name: 'P' + i,
    emoji: 'x',
    color: 'c',
  })),
  direction: 'cw',
  firstDealerIndex: 0,
  decks: 1,
  maxCards: maxFor(n, 1),
  lengthMode: 'endless',
  rounds: [],
  status: 'active',
  ui: { view: 'round', bidIdx: 0 },
});

/** Plays rounds where `rows[i][k]` says whether player k made their bid in round i. */
const play = (n: number, rows: boolean[][]) => {
  const g = mkGame(n);
  rows.forEach((made, i) => {
    const r = newRound(g, i);
    g.players.forEach((p, k) => {
      r.bids[p.id] = 1;
      r.results[p.id] = made[k] ? 'made' : 'missed';
    });
    r.phase = 'done';
    g.rounds.push(r);
  });
  return g;
};

const Y = true,
  N = false;

describe('current streaks', () => {
  it('counts the run of made (hot) or missed (cold) bids up to the last finished round', () => {
    const g = play(3, [
      [Y, N, Y],
      [Y, N, N],
      [Y, N, Y],
    ]);
    expect(currentStreaks(g)).toEqual({
      p0: { kind: 'hot', n: 3 },
      p1: { kind: 'cold', n: 3 },
      p2: { kind: 'hot', n: 1 },
    });
  });

  it('is empty before any round is finished, and ignores the round being played', () => {
    const g = play(3, [[Y, Y, N]]);
    expect(currentStreaks(mkGame(3))).toEqual({ p0: null, p1: null, p2: null });
    const r = newRound(g, 1);
    r.results = { p0: 'missed' };
    r.phase = 'results';
    g.rounds.push(r);
    expect(currentStreaks(g).p0).toEqual({ kind: 'hot', n: 1 });
  });
});

describe('streak milestones', () => {
  it('fires when a run reaches 3, 5 or 8, not in between or after', () => {
    const hits = (rounds: number) =>
      streakMilestones(
        play(
          3,
          Array.from({ length: rounds }, () => [Y, N, Y]),
        ),
      ).length;
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(hits)).toEqual([0, 0, 3, 0, 3, 0, 0, 3, 0]);
  });

  it('lists hot runs before cold ones, longest first', () => {
    const g = play(4, [
      [N, Y, Y, N],
      [N, Y, Y, N],
      [Y, Y, Y, N],
      [Y, Y, Y, N],
      [Y, Y, N, N],
    ]);
    expect(streakMilestones(g).map((e) => [e.p.id, e.kind, e.n, e.tier])).toEqual([
      ['p1', 'hot', 5, 1],
      ['p0', 'hot', 3, 0],
      ['p3', 'cold', 5, 1],
    ]);
  });

  it('tiers a run by the last step it passed', () => {
    expect([2, 3, 4, 5, 7, 8, 12].map(streakTier)).toEqual([-1, 0, 0, 1, 1, 2, 2]);
  });
});
