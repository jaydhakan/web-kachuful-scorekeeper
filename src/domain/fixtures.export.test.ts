import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { kitGame, rows, type KitGame } from './__fixtures__/kit';
import {
  allAchievements,
  buildFacts,
  careerAchievements,
  dailyAwards,
  gameFacts,
  gameEndedAt,
  leaderboard,
  METRICS,
  rangeFor,
  roundFacts,
  season,
  standings,
  totals,
  validate,
  type Game,
} from './index';

/**
 * The backend's golden fixtures (plan-backend §12.1). `EXPORT_FIXTURES=1 npx vitest run
 * src/domain/fixtures.export.test.ts` rewrites contract/fixtures; otherwise this checks the committed files still
 * match the rules, so a rule change can't drift from what the server was given.
 */
const DIR = path.resolve(import.meta.dirname, '../../contract/fixtures');
const TZ = 'Asia/Kolkata';
const T0 = Date.UTC(2026, 9, 10, 6, 30);
const NOW = T0 + 40 * 864e5;
const MIN = 60e3;

const g = (k: Omit<KitGame, 'start'> & { start?: number }) => kitGame({ start: T0, ...k });

function gameFixture(name: string, game: Game) {
  const v = validate(game, NOW);
  const end = gameEndedAt(game, NOW).at;
  const rf = roundFacts(game);
  const f = buildFacts([game], NOW);
  return {
    kind: 'game',
    name,
    game,
    expect: {
      valid: v.ok,
      ...(!v.ok && { reason: v.reason, roundIndex: v.roundIndex ?? null }),
      ...(v.ok && {
        endedAt: end,
        totals: totals(game),
        places:
          end == null ? null : Object.fromEntries(standings(game).map((s) => [s.p.id, s.rank])),
        gamePlayers: gameFacts(game, end, rf),
        roundScores: rf,
        achievements: allAchievements(f, TZ),
      }),
    },
  };
}

function setFixture(name: string, games: Game[]) {
  const f = buildFacts(games, NOW);
  const ranges = (['today', '7d', 'month', 'lastMonth', 'all'] as const).map((k) =>
    rangeFor(k, T0 + 864e5, TZ),
  );
  const days = ['2026-10-10', '2026-10-11', '2026-10-12'];
  return {
    kind: 'set',
    name,
    tz: TZ,
    now: NOW,
    games,
    expect: {
      leaderboard: ranges.flatMap((r) =>
        METRICS.map((metric) => ({
          query: { from: r.from, to: r.to, metric, range: r.kind },
          ...leaderboard(f, { from: r.from, to: r.to, metric }),
        })),
      ),
      daily: days.map((day) => ({ date: day, awards: dailyAwards(f, day, TZ) })),
      season: [season(f, '2026-10', TZ), season(f, '2026-09', TZ)],
      career: careerAchievements(f),
      achievements: allAchievements(f, TZ),
    },
  };
}

function build() {
  const out: Record<string, unknown> = {};
  const add = (file: string, v: unknown) => (out[file] = v);
  add(
    'game-basic',
    gameFixture(
      'a finished 3-player game',
      g({
        id: '10000000-0000-4000-8000-000000000001',
        players: ['a', 'b', 'c'],
        rounds: rows(3, 6, [0]),
        finished: true,
      }),
    ),
  );
  add(
    'game-unfinished',
    gameFixture(
      'an active game: no places until it ends',
      g({
        id: '10000000-0000-4000-8000-000000000002',
        players: ['a', 'b', 'c', 'd'],
        rounds: rows(4, 4, (i) => [i % 4]),
        start: NOW - 3600e3,
      }),
    ),
  );
  add(
    'game-autoended',
    gameFixture(
      'idle for a day: ended at its last round',
      g({
        id: '10000000-0000-4000-8000-000000000003',
        players: ['a', 'b', 'c'],
        rounds: rows(3, 3, [1]),
      }),
    ),
  );
  add(
    'game-moments',
    gameFixture(
      'round moments: runs, hooked, lone wolf, odd one out',
      g({
        id: '10000000-0000-4000-8000-000000000004',
        players: ['a', 'b', 'c', 'd'],
        firstDealer: 2,
        rounds: [
          { made: [true, true, true, false] },
          { made: [false, true, true, true] },
          { made: [true, false, false, false], hookHits: 1 },
          ...rows(4, 10, [0]).map((r) => ({ ...r, made: [true, false, true, true] })),
        ],
        finished: true,
      }),
    ),
  );
  add(
    'game-comeback',
    gameFixture(
      'last after halfway, then won',
      g({
        id: '10000000-0000-4000-8000-000000000005',
        players: ['a', 'b', 'c'],
        rounds: [...rows(3, 3, [1, 2]), ...rows(3, 5, [0])],
        finished: true,
      }),
    ),
  );
  add(
    'game-night',
    gameFixture(
      'ended at 02:00 Kolkata: night owl',
      g({
        id: '10000000-0000-4000-8000-000000000006',
        players: ['a', 'b', 'c'],
        start: Date.UTC(2026, 9, 10, 20),
        rounds: rows(3, 3, [2]),
        finished: true,
      }),
    ),
  );
  add(
    'game-two-decks',
    gameFixture(
      'ten players, two decks: full house',
      g({
        id: '10000000-0000-4000-8000-000000000007',
        decks: 2,
        players: 'abcdefghij'.split(''),
        rounds: rows(10, 4, [3]),
        finished: true,
      }),
    ),
  );
  const bad = (id: string, why: string, spoil: (x: Game) => void) => {
    const x = g({ id, players: ['a', 'b', 'c'], rounds: rows(3, 3, [0]), finished: true });
    spoil(x);
    add(`invalid-${why}`, gameFixture(`rejected: ${why}`, x));
  };
  bad('20000000-0000-4000-8000-000000000001', 'players', (x) => (x.players[1].name = ''));
  bad('20000000-0000-4000-8000-000000000002', 'max_cards', (x) => (x.maxCards = 9));
  bad('20000000-0000-4000-8000-000000000003', 'round_plan', (x) => (x.rounds[2].dealerIndex = 0));
  bad(
    '20000000-0000-4000-8000-000000000004',
    'round_order',
    (x) => (x.rounds[1].phase = 'results'),
  );
  bad(
    '20000000-0000-4000-8000-000000000005',
    'bids',
    (x) => (x.rounds[0].bids = { p0: 1, p1: 1, p2: 1 }),
  );
  bad('20000000-0000-4000-8000-000000000006', 'results', (x) => (x.rounds[0].results.p1 = 'made'));
  bad(
    '20000000-0000-4000-8000-000000000007',
    'tricks',
    (x) => (x.rounds[0].tricks = { p0: 3, p1: 1, p2: 0 }),
  );
  bad('20000000-0000-4000-8000-000000000008', 'times', (x) => (x.rounds[1].doneAt = NOW + 3600e3));

  // A month of play among five people, over several days, for boards, awards, seasons and career.
  const people = ['ana', 'ben', 'cy', 'dee', 'eli'];
  const month: Game[] = [];
  for (let k = 0; k < 14; k++) {
    const seats = people.filter((_, i) => (i + k) % 5 !== 4).slice(0, 3 + (k % 2));
    month.push(
      g({
        id: `30000000-0000-4000-8000-${String(k).padStart(12, '0')}`,
        players: seats,
        start: T0 + Math.floor(k / 3) * 864e5 + (k % 3) * 120 * MIN - 31 * 864e5 * Number(k < 2),
        rounds: rows(seats.length, 8 + (k % 5), (i) =>
          i % 2 ? [(i + k) % seats.length] : [0, (i + k + 1) % seats.length || 1],
        ),
        finished: k % 4 !== 3,
      }),
    );
  }
  add('set-month', setFixture('two weeks of five players, plus two games the month before', month));
  return out;
}

describe('golden fixtures for the backend', () => {
  const all = build();
  // Round-trips through JSON so Infinity, undefined and key order compare as the files store them.
  const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

  it('every game fixture except the invalid ones validates', () => {
    for (const [file, fx] of Object.entries(all))
      if (file.startsWith('game-'))
        expect((fx as { expect: { valid: boolean } }).expect.valid, file).toBe(true);
      else if (file.startsWith('invalid-'))
        expect((fx as { expect: { reason: string } }).expect.reason, file).toBe(
          file.slice('invalid-'.length),
        );
  });

  it(
    process.env.EXPORT_FIXTURES ? 'writes contract/fixtures' : 'contract/fixtures match the rules',
    () => {
      if (process.env.EXPORT_FIXTURES) {
        mkdirSync(DIR, { recursive: true });
        for (const [file, fx] of Object.entries(all))
          writeFileSync(path.join(DIR, file + '.json'), json(fx));
        return;
      }
      expect(existsSync(DIR)).toBe(true);
      expect(
        readdirSync(DIR)
          .filter((f) => f.endsWith('.json'))
          .sort(),
      ).toEqual(
        Object.keys(all)
          .map((f) => f + '.json')
          .sort(),
      );
      for (const [file, fx] of Object.entries(all))
        expect(readFileSync(path.join(DIR, file + '.json'), 'utf8'), file).toBe(json(fx));
    },
  );
});
