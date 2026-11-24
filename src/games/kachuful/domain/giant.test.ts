import { kitGame, rows } from './__fixtures__/kit';
import { buildFacts, gameEndedAt, gameFacts, type Game } from './index';
import { deviceAchievements, giantKillers, giantKills } from './giant';
import type { Holder } from './medals';

const T0 = Date.UTC(2026, 9, 10, 6, 30);
const gold: Holder = { medal: 1, defending: false };
const held = (o: Record<string, Holder>) => new Map(Object.entries(o));
const facts = (g: Game) => gameFacts(g, gameEndedAt(g, T0 + 864e5).at);
const winners = (g: Game, h: Record<string, Holder>) =>
  giantKillers(facts(g), held(h)).map((e) => e.playerId);

// b 1st, c 2nd, d 3rd, a last.
const four = kitGame({
  id: 'g4',
  players: ['a', 'b', 'c', 'd'],
  start: T0,
  rounds: rows(4, 4, (i) => (i < 2 ? [1, 2] : [1])),
  finished: true,
});
// b and c share 1st, d 3rd, a last.
const tied = kitGame({
  id: 'gt',
  players: ['a', 'b', 'c', 'd'],
  start: T0,
  rounds: rows(4, 4, [1, 2]),
  finished: true,
});

describe('Giant Killer', () => {
  it('goes to a player with no medal who finishes above the seated Badshah', () => {
    const e = giantKillers(facts(four), held({ c: gold }));
    expect(e).toEqual([
      {
        code: 'giant_killer',
        playerId: 'b',
        gameId: 'g4',
        roundIndex: null,
        period: null,
        earnedAt: four.finishedAt,
        data: { badshah: 'c' },
      },
    ]);
  });

  it('is not for a player holding a medal', () => {
    expect(winners(four, { c: gold, b: { medal: 3, defending: false } })).toEqual([]);
  });

  it('needs three players', () => {
    const two = kitGame({
      id: 'g2',
      players: ['a', 'b'],
      start: T0,
      rounds: rows(2, 3, [1]),
      finished: true,
    });
    expect(winners(two, { a: gold })).toEqual([]);
  });

  it('needs a Badshah at the table, and counts one defending last month', () => {
    expect(winners(four, { zed: gold })).toEqual([]);
    expect(winners(four, { d: { medal: 1, defending: true } })).toEqual(['b', 'c']);
  });

  it('a tie with the Badshah is not above; a tie above is, for both', () => {
    expect(winners(tied, { c: gold })).toEqual([]);
    expect(winners(tied, { d: gold })).toEqual(['b', 'c']);
  });

  it('is not for a game still being played', () => {
    const live = kitGame({
      id: 'gl',
      players: ['a', 'b', 'c'],
      start: T0,
      rounds: rows(3, 3, [1]),
    });
    expect(giantKillers(gameFacts(live, null), held({ c: gold }))).toEqual([]);
  });

  it('on the device, reads the medals from the games before', () => {
    // Fifty-odd rounds for c, d and e earlier in the month put c on top of the board with every bid made.
    const before = kitGame({
      id: 'gb',
      players: ['c', 'd', 'e'],
      start: T0,
      rounds: rows(3, 60, [0, 1]).map((r, i) => ({ ...r, at: i + 1 })),
      finished: true,
    });
    const after = kitGame({
      id: 'ga',
      players: ['a', 'b', 'c', 'd'],
      start: T0 + 864e5,
      rounds: rows(4, 4, (i) => (i < 2 ? [1, 3] : [1])),
      finished: true,
    });
    const f = buildFacts([before, after], T0 + 2 * 864e5);
    // c holds gold and d silver; b (no medal) finishes above c.
    expect(giantKills(f).map((e) => [e.playerId, e.gameId, e.data])).toEqual([
      ['b', 'ga', { badshah: 'c' }],
    ]);
    expect(deviceAchievements(f).filter((e) => e.code === 'giant_killer')).toHaveLength(1);
  });
});
