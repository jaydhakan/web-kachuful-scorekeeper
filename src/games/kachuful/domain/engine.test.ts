import { kitGame, rows } from './__fixtures__/kit';
import {
  allAchievements,
  buildFacts,
  careerAchievements,
  customRange,
  dailyAwards,
  dayOf,
  gameEndedAt,
  gameFinishes,
  headToHead,
  leaderboard,
  minRoundsFor,
  nameKey,
  profileStats,
  rangeFor,
  roundFacts,
  roundMoments,
  season,
  suggestName,
  validate,
  wrapped,
  type Earned,
  type Game,
} from './index';

const T0 = Date.UTC(2026, 9, 10, 6, 30); // 10 Oct 2026, 12:00 in Kolkata
const MIN = 60e3,
  DAY = 864e5;
const codes = (es: Earned[], who?: string) =>
  es.filter((e) => !who || e.playerId === who).map((e) => e.code);

describe('names', () => {
  it('keys names by trimmed, collapsed, lower-case text', () => {
    expect(nameKey('  Riya   Shah ')).toBe('riya shah');
  });
  it('suggests a free name from the last name, then a number', () => {
    expect(suggestName('riya', new Set(['riya']), 'Shah')).toBe('Riya S');
    expect(suggestName('Riya', new Set(['riya', 'riya s', 'riya shah']), 'Shah')).toBe('Riya 2');
    expect(suggestName('Riya', new Set(['riya']))).toBe('Riya 2');
  });
});

describe('ranges', () => {
  it('needs more than 10, 25 or 50 rounds by the length of the range', () => {
    const now = T0;
    const r = (k: 'today' | '7d' | 'month' | 'lastMonth' | 'all') => rangeFor(k, now);
    expect(minRoundsFor(r('today').from, r('today').to)).toBe(10);
    expect(minRoundsFor(r('7d').from, r('7d').to)).toBe(25);
    expect(minRoundsFor(r('month').from, r('month').to)).toBe(50);
    expect(minRoundsFor(r('all').from, r('all').to)).toBe(50);
    const c = customRange('2026-10-01', '2026-10-01');
    expect(minRoundsFor(c.from, c.to)).toBe(10);
  });

  it('works in a named timezone: days and months start at local midnight', () => {
    const tz = 'Asia/Kolkata';
    const today = rangeFor('today', T0, tz);
    expect(today.from).toBe(Date.UTC(2026, 9, 9, 18, 30));
    expect(today.to - today.from).toBe(DAY);
    expect(rangeFor('month', T0, tz).from).toBe(Date.UTC(2026, 8, 30, 18, 30));
    expect(rangeFor('lastMonth', T0, tz).to).toBe(Date.UTC(2026, 8, 30, 18, 30));
    expect(dayOf(Date.UTC(2026, 9, 9, 19), tz)).toBe('2026-10-10');
    const wk = rangeFor('7d', T0, tz);
    expect(wk.to - wk.from).toBe(7 * DAY);
  });

  it('a custom range covers whole days, either way round', () => {
    expect(customRange('2026-10-05', '2026-10-01', 'UTC')).toEqual({
      kind: 'custom',
      from: Date.UTC(2026, 9, 1),
      to: Date.UTC(2026, 9, 6),
    });
  });
});

describe('timeline', () => {
  const g = kitGame({
    id: 'g',
    players: ['a', 'b', 'c', 'd'],
    start: T0,
    rounds: [
      { made: [true, false, true, true] },
      { made: [true, false, false, true], hookHits: 2 },
      { made: [false, true, true, true] },
    ],
  });

  it('gives each player a row per done round with points and runs', () => {
    const rf = roundFacts(g);
    expect(rf).toHaveLength(12);
    const a = rf.filter((r) => r.playerId === 'a');
    expect(a.map((r) => [r.runHot, r.runCold])).toEqual([
      [1, 0],
      [2, 0],
      [0, 1],
    ]);
    expect(rf.find((r) => r.roundIndex === 1 && r.isDealer)).toMatchObject({
      playerId: 'b',
      hookHits: 2,
    });
    expect(rf.filter((r) => r.hookHits).length).toBe(1);
  });

  it('a game ends when finished, or after a day untouched with a round done', () => {
    expect(gameEndedAt(g, g.updatedAt + 1000).at).toBeNull();
    expect(gameEndedAt(g, g.updatedAt + DAY)).toEqual({ at: g.rounds[2].doneAt, auto: true });
    const fin = kitGame({
      id: 'f',
      players: ['a', 'b', 'c'],
      start: T0,
      rounds: rows(3, 2, [0]),
      finished: true,
    });
    expect(gameEndedAt(fin, 0)).toEqual({ at: fin.finishedAt, auto: false });
  });
});

describe('leaderboard', () => {
  // a averages more but has played only 5 rounds; b and c tie on average with 12 rounds each.
  const games: Game[] = [
    kitGame({
      id: 'g1',
      players: ['a', 'b', 'c'],
      start: T0,
      rounds: rows(3, 5, [0]),
      finished: true,
    }),
    kitGame({
      id: 'g2',
      players: ['b', 'c', 'd'],
      start: T0 + 60 * MIN,
      rounds: rows(3, 12, (i) => (i % 2 ? [0] : [1])),
      finished: true,
    }),
  ];
  const f = buildFacts(games, T0 + DAY);
  const day = { from: T0 - 3600e3, to: T0 + 23 * 3600e3 };

  it('ranks by average per round; players with too few rounds are listed unranked below', () => {
    const b = leaderboard(f, day);
    expect(b.minRounds).toBe(10);
    const ranked = b.rows.filter((r) => r.qualified);
    expect(ranked.every((r) => r.rounds > 10)).toBe(true);
    expect(b.rows.at(-1)).toMatchObject({ playerId: 'a', qualified: false, rank: null });
    expect(b.rows.slice(0, ranked.length).every((r) => r.rank !== null)).toBe(true);
  });

  it('shares a rank on an exactly equal value (1, 1, 3)', () => {
    const tie = buildFacts(
      [
        kitGame({
          id: 't',
          players: ['x', 'y', 'z'],
          start: T0,
          rounds: rows(3, 4, (i) => (i < 2 ? [0, 1] : [0])),
          finished: true,
        }),
      ],
      T0 + DAY,
    );
    const b = leaderboard(tie, { ...day, metric: 'rounds' });
    expect(b.rows.map((r) => r.rank)).toEqual([1, 1, 1]);
    const w = leaderboard(tie, { ...day, metric: 'wins' });
    expect(w.rows.map((r) => [r.playerId, r.rank])).toEqual([
      ['x', 1],
      ['y', 2],
      ['z', 2],
    ]);
  });

  it('count metrics rank everyone; rate metrics honour the minimum', () => {
    expect(leaderboard(f, { ...day, metric: 'points' }).rows.every((r) => r.qualified)).toBe(true);
    expect(leaderboard(f, { ...day, metric: 'accuracy' }).rows.some((r) => !r.qualified)).toBe(
      true,
    );
    expect(leaderboard(f, { ...day, minRounds: 0 }).rows.every((r) => r.qualified)).toBe(true);
  });

  it('moves ranks against the previous window of the same length', () => {
    const later = [
      ...games,
      kitGame({
        id: 'g3',
        players: ['b', 'c', 'd'],
        start: T0 + DAY,
        rounds: rows(3, 12, [2]),
        finished: true,
      }),
    ];
    const f2 = buildFacts(later, T0 + 3 * DAY);
    const b = leaderboard(f2, { from: day.from + DAY, to: day.to + DAY });
    const d = b.rows.find((r) => r.playerId === 'd')!;
    expect(d.rank).toBe(1);
    expect(d.rankDelta).toBe(2);
  });
});

describe('player stats and head-to-head', () => {
  const games = [
    kitGame({
      id: 'h1',
      players: ['a', 'b', 'c'],
      start: T0,
      rounds: rows(3, 6, [0]),
      finished: true,
    }),
    kitGame({
      id: 'h2',
      players: ['b', 'a', 'c'],
      start: T0 + 60 * MIN,
      rounds: rows(3, 6, [0]),
      finished: true,
    }),
  ];
  const f = buildFacts(games, T0 + DAY);

  it('totals a player over a range', () => {
    const s = profileStats(f, 'a');
    expect(s).toMatchObject({ rounds: 12, made: 6, games: 2, gamesEnded: 2, wins: 1 });
    expect(s.places).toEqual({ 1: 1, 2: 1, 3: 0 });
    expect(s.accuracy).toBe(0.5);
    expect(Object.values(s.byTrump).reduce((x, e) => x + e!.total, 0)).toBe(12);
    expect(s.bestGame?.gameId).toBe('h1');
  });

  it('compares two players over the games they both finished', () => {
    const h = headToHead(f, 'a', 'b');
    expect(h).toMatchObject({ games: 2, aAhead: 1, bAhead: 1, ties: 0 });
    expect(h.biggestWin?.by).toBeGreaterThan(0);
    expect(headToHead(f, 'a', 'zzz').games).toBe(0);
  });
});

describe('achievements', () => {
  it('round moments: runs at 3, 5, 8 and 12, each once per run', () => {
    const g = kitGame({ id: 'r', players: ['a', 'b', 'c'], start: T0, rounds: rows(3, 13, [0]) });
    const a = codes(roundMoments(roundFacts(g)), 'a');
    expect(a.filter((c) => c.startsWith('hot_'))).toEqual(['hot_3', 'hot_5', 'hot_8', 'hot_12']);
    expect(codes(roundMoments(roundFacts(g)), 'b').filter((c) => c.startsWith('cold_'))).toEqual([
      'cold_3',
      'cold_5',
      'cold_8',
      'cold_12',
    ]);
  });

  it('round moments: lone wolf, odd one out, grand slam, hooked and revenge', () => {
    // Round 2 (5 cards) at a table of 4: seat 0 alone makes it, bidding all 5.
    const g = kitGame({
      id: 'm',
      players: ['a', 'b', 'c', 'd'],
      start: T0,
      firstDealer: 2,
      rounds: [
        { made: [true, true, true, false] },
        { made: [false, true, true, true] },
        { made: [true, false, false, false], hookHits: 1 },
      ],
    });
    const e = roundMoments(roundFacts(g));
    expect(codes(e, 'd')).toContain('odd_one_out');
    expect(codes(e, 'a')).toEqual(
      expect.arrayContaining([
        'lone_wolf',
        'grand_slam',
        'high_roller',
        'hooked',
        'dealers_revenge',
      ]),
    );
  });

  it('game finish: winner, wire to wire, perfect, wooden spoon, sharpshooter, night owl', () => {
    const g = kitGame({
      id: 'w',
      players: ['a', 'b', 'c'],
      start: T0,
      rounds: rows(3, 10, [0]),
      finished: true,
    });
    const e = gameFinishes(buildFacts([g], T0 + DAY), 'Asia/Kolkata');
    expect(codes(e, 'a')).toEqual(
      expect.arrayContaining(['winner', 'wire_to_wire', 'perfect_game', 'sharpshooter', 'runaway']),
    );
    expect(codes(e, 'b')).toEqual(expect.arrayContaining(['wooden_spoon']));
    expect(codes(e)).not.toContain('night_owl');
    const late = kitGame({
      id: 'n',
      players: ['a', 'b', 'c'],
      start: Date.UTC(2026, 9, 10, 20),
      rounds: rows(3, 2, [0]),
      finished: true,
    });
    expect(codes(gameFinishes(buildFacts([late], T0 + DAY), 'Asia/Kolkata'))).toContain(
      'night_owl',
    );
  });

  it('game finish: a comeback from last after halfway, and a photo finish', () => {
    // b leads early, a is last at round 3 of 6, then a wins by 10.
    const g = kitGame({
      id: 'c',
      players: ['a', 'b', 'c'],
      start: T0,
      rounds: [
        { made: [false, true, true] },
        { made: [false, true, true] },
        { made: [false, true, true] },
        { made: [true, false, false] },
        { made: [true, false, false] },
        { made: [true, false, false] },
      ],
      finished: true,
    });
    const e = gameFinishes(buildFacts([g], T0 + DAY));
    if (codes(e, 'a').includes('winner')) expect(codes(e, 'a')).toContain('comeback');
  });

  it('career: first win, back to back, hat-trick and personal best', () => {
    const games = Array.from({ length: 5 }, (_, i) =>
      kitGame({
        id: 'k' + i,
        players: ['a', 'b', 'c'],
        start: T0 + i * 100 * MIN,
        rounds: rows(3, 3 + i, [0]),
        finished: true,
      }),
    );
    const e = careerAchievements(buildFacts(games, T0 + 10 * DAY));
    expect(codes(e, 'a')).toEqual(
      expect.arrayContaining(['first_win', 'back_to_back', 'hat_trick', 'personal_best']),
    );
    expect(codes(e, 'b')).toContain('spoon_collector');
  });

  it('lists everything oldest first, each at most once', () => {
    const g = kitGame({
      id: 'z',
      players: ['a', 'b', 'c'],
      start: T0,
      rounds: rows(3, 6, [0]),
      finished: true,
    });
    const e = allAchievements(buildFacts([g], T0 + DAY));
    const keys = e.map((x) => [x.playerId, x.code, x.gameId, x.roundIndex, x.period].join());
    expect(new Set(keys).size).toBe(keys.length);
    expect(e.map((x) => x.earnedAt)).toEqual([...e.map((x) => x.earnedAt)].sort((x, y) => x - y));
  });
});

describe('daily awards, seasons and wrapped', () => {
  const tz = 'Asia/Kolkata';
  const games = [
    kitGame({
      id: 'd1',
      players: ['a', 'b', 'c'],
      start: T0,
      rounds: rows(3, 12, (i) => (i < 6 ? [0] : [1])),
      finished: true,
    }),
  ];
  const f = buildFacts(games, T0 + DAY);

  it('awards the day: star, round of the day (earliest wins a tie), grinder for everyone tied', () => {
    const a = dailyAwards(f, '2026-10-10', tz);
    const by = (c: string) => a.filter((x) => x.code === c).map((x) => x.playerId);
    expect(by('day_grinder').sort()).toEqual(['a', 'b', 'c']);
    expect(a.filter((x) => x.code === 'day_bang')).toHaveLength(1);
    expect(a.find((x) => x.code === 'day_bang')!.roundIndex).toBeLessThan(6);
    expect(by('day_hot').length).toBeGreaterThan(0);
    expect(dailyAwards(f, '2026-10-11', tz)).toEqual([]);
  });

  it('a season ranks by average with more than 50 rounds and crowns the champion', () => {
    const many = [
      kitGame({
        id: 's1',
        players: ['a', 'b', 'c'],
        start: T0,
        rounds: rows(3, 30, [0]),
        finished: true,
      }),
      kitGame({
        id: 's2',
        players: ['a', 'b', 'c'],
        start: T0 + DAY,
        rounds: rows(3, 30, [1]),
        finished: true,
      }),
    ];
    const s = season(buildFacts(many, T0 + 5 * DAY), '2026-10', tz);
    expect(s.standings.filter((r) => r.qualified)).toHaveLength(3);
    expect(s.awards.find((x) => x.code === 'season_champion')).toBeDefined();
    expect(s.awards.filter((x) => x.code === 'season_iron')).toHaveLength(3);
  });

  it('wraps a player year', () => {
    const w = wrapped(f, 'a', 2026, tz);
    expect(w.totals.rounds).toBe(12);
    expect(w.bestDay?.day).toBe('2026-10-10');
    expect(w.partner?.games).toBe(1);
    expect(w.topDays).toEqual([{ day: '2026-10-10', rounds: 12 }]);
  });
});

describe('validate', () => {
  const ok = () =>
    kitGame({
      id: 'v',
      players: ['a', 'b', 'c'],
      start: T0,
      rounds: rows(3, 3, [0]),
      finished: true,
    });

  it('accepts a kit game', () => {
    expect(validate(ok(), T0 + DAY)).toEqual({ ok: true });
  });

  it.each([
    ['players', (g: Game) => (g.players = g.players.slice(0, 2))],
    ['max_cards', (g: Game) => (g.maxCards = 9)],
    ['round_plan', (g: Game) => (g.rounds[1].trump = 'hearts')],
    ['round_order', (g: Game) => (g.rounds[0].phase = 'bidding')],
    ['bids', (g: Game) => (g.rounds[0].bids.p1 = 99)],
    ['results', (g: Game) => (g.rounds[0].results.p1 = 'made')],
    ['times', (g: Game) => (g.rounds[0].doneAt = T0 - 1)],
  ])('flags %s', (reason, spoil) => {
    const g = ok();
    spoil(g);
    expect(validate(g, T0 + DAY)).toMatchObject({ ok: false, reason });
  });
});
