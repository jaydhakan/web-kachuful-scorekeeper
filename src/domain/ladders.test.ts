import { allAchievements, LADDERS, ladderCounts } from './achievements';
import { buildFacts } from './timeline';
import { kitGame, rows } from './__fixtures__/kit';

const T0 = Date.UTC(2026, 0, 5, 12);
const H = 3600e3;

// 12 games: seat 0 takes every trick, so 'a' wins the first 7 (a run of 7) then loses 5; 'b' and 'c' rotate in.
const games = Array.from({ length: 12 }, (_, g) =>
  kitGame({
    id: 'l' + g,
    players: g < 7 ? ['a', 'b', 'c'] : ['b', 'a', g % 2 ? 'c' : 'd'],
    start: T0 + g * H,
    rounds: rows(3, 10, (i) => (i % 4 === 3 ? [1] : [0, 2])),
    finished: true,
  }),
);
const f = buildFacts(games, T0 + 30 * H);

describe('ladder counts', () => {
  it('reach exactly the levels that were earned', () => {
    const earned = allAchievements(f);
    for (const id of ['a', 'b', 'c', 'd']) {
      const n = ladderCounts(f, id);
      const have = new Set(earned.filter((e) => e.playerId === id).map((e) => e.code));
      for (const l of LADDERS)
        l.codes.forEach((code, i) =>
          expect([id, code, have.has(code)]).toEqual([id, code, n[l.id] >= l.steps[i]]),
        );
    }
  });

  it('count what each ladder measures', () => {
    const n = ladderCounts(f, 'a');
    expect(n.games).toBe(12);
    expect(n.rounds).toBe(120);
    expect(n.wins).toBe(7);
    expect(n.crew).toBe(3);
    expect(n.hot).toBeGreaterThanOrEqual(3);
  });
});
