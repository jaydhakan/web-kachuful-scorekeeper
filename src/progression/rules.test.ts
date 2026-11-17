import { best } from './awards';
import {
  careerCounts,
  climber,
  crew,
  gamesPlayed,
  nightOwl,
  seasonPlaces,
  winRateSeason,
  winRateStandings,
  winStreaks,
  woodenSpoon,
} from './rules';
import { monthRange } from './zone';
import type { PlayerGameFact, WinRateRow } from './types';

const H = 3600e3;
const T0 = Date.UTC(2026, 9, 5, 12);

/** One finished game: `places[k]` is player k's place; 1 is a win. */
const game = (id: string, at: number, places: Record<string, number>): PlayerGameFact[] =>
  Object.entries(places).map(([playerId, place]) => ({
    gameId: id,
    playerId,
    endedAt: at,
    place,
    won: place === 1,
  }));

const codes = (xs: { code: string; playerId: string }[], who: string) =>
  xs.filter((e) => e.playerId === who).map((e) => e.code);

describe('win streaks', () => {
  it('earn First Win once, and Back to Back, Hat-trick and Dynasty as a run reaches 2, 3 and 5', () => {
    const results = [1, 1, 1, 2, 1, 1, 1, 1, 1];
    const facts = results.flatMap((p, k) =>
      game('g' + k, T0 + k * H, { a: p, b: p === 1 ? 2 : 1 }),
    );
    const e = winStreaks(facts);
    expect(codes(e, 'a')).toEqual([
      'first_win',
      'back_to_back',
      'hat_trick',
      'back_to_back',
      'hat_trick',
      'dynasty',
    ]);
    expect(e.find((x) => x.code === 'dynasty')).toMatchObject({
      gameId: 'g8',
      earnedAt: T0 + 8 * H,
    });
    expect(codes(e, 'b')).toEqual(['first_win']);
  });

  it('count in the order games ended, not the order given', () => {
    const facts = [...game('late', T0 + 2 * H, { a: 1 }), ...game('early', T0, { a: 2 })];
    facts.push(...game('mid', T0 + H, { a: 1 }));
    expect(winStreaks(facts).map((e) => [e.code, e.gameId])).toEqual([
      ['first_win', 'mid'],
      ['back_to_back', 'late'],
    ]);
  });

  it('a draw is not a win and ends the run', () => {
    const facts = [
      ...game('g1', T0, { a: 1, b: 2 }),
      { gameId: 'g2', playerId: 'a', endedAt: T0 + H, place: 1, won: false },
      ...game('g3', T0 + 2 * H, { a: 1, b: 2 }),
    ];
    expect(codes(winStreaks(facts), 'a')).toEqual(['first_win']);
  });

  it('nothing without a win', () => {
    expect(winStreaks(game('g', T0, { a: 2, b: 1 })).filter((e) => e.playerId === 'a')).toEqual([]);
  });
});

describe('games played', () => {
  it('earn games_N at the Nth finished game, and not before', () => {
    const facts = Array.from({ length: 12 }, (_, k) => game('g' + k, T0 + k * H, { a: 1 })).flat();
    const e = gamesPlayed(facts);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ code: 'games_10', gameId: 'g9', data: { n: 10 } });
    expect(gamesPlayed(facts.slice(0, 9))).toEqual([]);
  });

  it('take any steps', () => {
    const facts = [0, 1, 2].flatMap((k) => game('g' + k, T0 + k * H, { a: 1 }));
    expect(gamesPlayed(facts, [1, 3]).map((e) => e.code)).toEqual(['games_1', 'games_3']);
  });
});

describe('crew', () => {
  const tables = (n: number) =>
    Array.from({ length: n }, (_, k) => game('g' + k, T0 + k * H, { a: 1, ['p' + k]: 2 })).flat();

  it('earns crew_10 at the game that brings the tenth different person', () => {
    const e = crew(tables(12)).filter((x) => x.playerId === 'a');
    expect(e).toEqual([
      expect.objectContaining({ code: 'crew_10', gameId: 'g9', data: { n: 10 } }),
    ]);
  });

  it('counts a person once however often they come back', () => {
    const facts = Array.from({ length: 20 }, (_, k) =>
      game('g' + k, T0 + k * H, { a: 1, ['p' + (k % 9)]: 2 }),
    ).flat();
    expect(crew(facts).filter((x) => x.playerId === 'a')).toEqual([]);
    expect(careerCounts(facts, 'a').crew).toBe(9);
  });

  it('earns both levels at once when one big table crosses both', () => {
    const big = Object.fromEntries(Array.from({ length: 26 }, (_, k) => ['p' + k, k + 1]));
    expect(codes(crew(game('g', T0, big)), 'p0')).toEqual(['crew_10', 'crew_25']);
  });
});

describe('night owl', () => {
  // 01:00 and 04:59 in Kolkata are 19:30 and 23:29 UTC the day before.
  const at = (h: number, m: number) => Date.UTC(2026, 9, 4, h, m);

  it('is a game finished from 1 am up to 5 am in the time zone given', () => {
    const tz = 'Asia/Kolkata';
    expect(nightOwl(game('a', at(19, 30), { x: 1 }), tz)).toHaveLength(1);
    expect(nightOwl(game('b', at(23, 29), { x: 1 }), tz)).toHaveLength(1);
    expect(nightOwl(game('c', at(19, 29), { x: 1 }), tz)).toEqual([]);
    expect(nightOwl(game('d', at(23, 30), { x: 1 }), tz)).toEqual([]);
  });

  it('goes to everyone at the table', () => {
    expect(nightOwl(game('a', at(20, 0), { x: 1, y: 2 }), 'Asia/Kolkata')).toHaveLength(2);
  });
});

describe('wooden spoon', () => {
  it('goes to everyone tied for last', () => {
    const e = woodenSpoon(game('g', T0, { a: 1, b: 2, c: 2 }));
    expect(e.map((x) => x.playerId).sort()).toEqual(['b', 'c']);
  });

  it('is nobody when everyone shares first', () => {
    expect(woodenSpoon(game('g', T0, { a: 1, b: 1 }))).toEqual([]);
  });
});

describe('career counts', () => {
  it('are the longest run of wins, the games finished and the people met', () => {
    const facts = [1, 1, 2, 1, 1, 1, 2].flatMap((p, k) =>
      game('g' + k, T0 + k * H, { a: p, b: 3, ['c' + (k % 2)]: 2 }),
    );
    expect(careerCounts(facts, 'a')).toEqual({ wins: 3, games: 7, crew: 3 });
    expect(careerCounts(facts, 'nobody')).toEqual({ wins: 0, games: 0, crew: 0 });
  });
});

describe('best', () => {
  it('gives the award to everyone tied on the best value, in id order', () => {
    expect(
      best(
        [
          ['b', 5],
          ['a', 5],
          ['c', 3],
        ],
        'day_star',
      ),
    ).toEqual([
      { code: 'day_star', playerId: 'a', value: 5 },
      { code: 'day_star', playerId: 'b', value: 5 },
    ]);
  });

  it('picks the lowest when asked', () => {
    expect(
      best(
        [
          ['a', 5],
          ['b', 2],
        ],
        'x',
        -1,
      ),
    ).toEqual([{ code: 'x', playerId: 'b', value: 2 }]);
  });

  it('gives nothing when no value passes the minimum', () => {
    expect(best([['a', 1]], 'x', 1, (v) => v >= 2)).toEqual([]);
    expect(best([], 'x')).toEqual([]);
  });
});

describe('win-rate standings', () => {
  const [from, to] = [T0 - H, T0 + 100 * H];
  /** `a` wins `w` of `n` games. */
  const record = (id: string, w: number, n: number, start: number) =>
    Array.from({ length: n }, (_, k) =>
      game(`${id}${k}`, T0 + (start + k) * H, { [id]: k < w ? 1 : 2 }),
    ).flat();

  it('rank by win rate once a player has the minimum, the rest unranked after', () => {
    const rows = winRateStandings(
      [...record('a', 6, 10, 0), ...record('b', 8, 10, 10), ...record('c', 4, 4, 20)],
      from,
      to,
      8,
    );
    expect(rows.map((r) => [r.playerId, r.rank, r.qualified, r.wins, r.games])).toEqual([
      ['b', 1, true, 8, 10],
      ['a', 2, true, 6, 10],
      ['c', null, false, 4, 4],
    ]);
    expect(rows[0].value).toBe(0.8);
  });

  it('break a tied rate with more games, and share a rank when the games tie too', () => {
    const rows = winRateStandings(
      [
        ...record('a', 5, 10, 0),
        ...record('b', 6, 12, 10),
        ...record('c', 5, 10, 30),
        ...record('d', 1, 10, 40),
      ],
      from,
      to,
      8,
    );
    expect(rows.map((r) => [r.playerId, r.rank])).toEqual([
      ['b', 1],
      ['a', 2],
      ['c', 2],
      ['d', 4],
    ]);
  });

  it('count only games that ended in the window', () => {
    const rows = winRateStandings(record('a', 2, 4, 0), T0 + 2 * H, to, 1);
    expect(rows[0]).toMatchObject({ games: 2, wins: 0 });
  });

  it('is empty with no games', () => {
    expect(winRateStandings([], from, to, 1)).toEqual([]);
  });
});

describe('a season by win rate', () => {
  const row = (playerId: string, rank: number | null): WinRateRow => ({
    playerId,
    rank,
    qualified: rank != null,
    value: 1 / (rank ?? 9),
    games: 10,
    wins: 1,
  });

  it('crowns 1st, 2nd and 3rd, ties sharing the place, and never the unranked', () => {
    const a = seasonPlaces([row('a', 1), row('b', 2), row('c', 2), row('d', 4), row('e', null)]);
    expect(a.map((x) => [x.code, x.playerId])).toEqual([
      ['season_champion', 'a'],
      ['season_runner_up', 'b'],
      ['season_runner_up', 'c'],
    ]);
  });

  it('names the biggest climber among those ranked both months, and nobody who fell', () => {
    const before = [row('a', 1), row('b', 2), row('c', 5), row('d', 3)];
    const now = [row('c', 1), row('a', 2), row('b', 3), row('e', 4)];
    expect(climber(now, before)).toEqual([{ code: 'season_climber', playerId: 'c', value: 4 }]);
    expect(climber([row('a', 2)], [row('a', 1)])).toEqual([]);
  });

  it('puts the month together from the facts', () => {
    const tz = 'Asia/Kolkata';
    const [oct] = monthRange('2026-10', tz);
    const [sep] = monthRange('2026-09', tz);
    const month = (start: number, wins: Record<string, number>) =>
      Object.entries(wins).flatMap(([id, w]) =>
        Array.from({ length: 4 }, (_, k) =>
          game(`${start}${id}${k}`, start + (k + 1) * H, { [id]: k < w ? 1 : 2 }),
        ).flat(),
      );
    const facts = [...month(sep, { a: 4, b: 2 }), ...month(oct, { a: 1, b: 3 })];
    const s = winRateSeason(facts, '2026-10', 4, tz);
    expect(s.standings.map((r) => [r.playerId, r.rank])).toEqual([
      ['b', 1],
      ['a', 2],
    ]);
    expect(s.awards.map((x) => [x.code, x.playerId])).toEqual([
      ['season_champion', 'b'],
      ['season_runner_up', 'a'],
      ['season_climber', 'b'],
    ]);
  });
});
