import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { kitGame, type KitGame, type KitHand } from './__fixtures__/kit';
import {
  careerAchievements,
  gameAchievements,
  gameFacts,
  ktFacts,
  ladderCounts,
  playerGames,
} from './achievements';
import { dailyAwards, playedDays, playedMonths, season } from './awards';
import { validate } from './validate';
import type { KtGame } from './types';
import { earnedKey, type Earned } from '../../../progression/types';

/**
 * Kaali Teeri's achievements and awards fixtures for the backend (contract/README.md). `EXPORT_FIXTURES=1 npx vitest
 * run src/games/kaali-teeri/domain/progression.export.test.ts` rewrites contract/fixtures/kaali-teeri-*.json;
 * otherwise this checks the committed files still match the rules.
 */
const DIR = path.resolve(import.meta.dirname, '../../../../contract/fixtures');
const PREFIX = 'kaali-teeri-';
const TZ = 'Asia/Kolkata';
const DAY = 864e5;
// 10:00 in Kolkata.
const T0 = Date.UTC(2026, 10, 2, 4, 30);
const PEOPLE = ['ana', 'ben', 'cy', 'dee', 'eli', 'fay', 'gus', 'hal', 'ivy', 'jo', 'kai', 'lu'];

let seq = 0;
const g = (n: number, hands: KitHand[], k: Partial<KitGame> = {}): KtGame =>
  kitGame({
    id: `50000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
    players: PEOPLE.slice(0, n),
    start: T0 + seq * DAY,
    finished: true,
    hands,
    ...k,
  });

/** The bidder holds all `k` called cards. */
const lone = (bidder: number, bid = 150, k = 1): KitHand => ({
  bidder,
  bid,
  team: bid % 250 ? bid + 10 : bid,
  playedBy: Array.from({ length: k }, () => bidder),
});
const pair = (bidder: number, partner: number, team = 160): KitHand => ({
  bidder,
  bid: 150,
  team,
  playedBy: [partner],
});
const miss = (bidder: number, bid = 200, team = 100): KitHand => ({ bidder, bid, team });

const sorted = (es: Earned[]) => [...es].sort((a, b) => (earnedKey(a) < earnedKey(b) ? -1 : 1));
const keysOf = (games: KtGame[]) =>
  [...new Set(ktFacts(games).seats.map((s) => s.playerId))].sort();

function achievementsFixture(name: string, games: KtGame[]) {
  const f = ktFacts(games);
  return {
    kind: 'achievements',
    name,
    tz: TZ,
    games,
    facts: f,
    expect: {
      games: games.map((x) => ({
        gameId: x.syncId,
        earned: sorted(gameAchievements(gameFacts(x), TZ)),
      })),
      career: sorted(careerAchievements(f)),
      ladders: Object.fromEntries(keysOf(games).map((k) => [k, ladderCounts(f, k)])),
    },
  };
}

function awardsFixture(name: string, games: KtGame[]) {
  const f = ktFacts(games);
  return {
    kind: 'awards',
    name,
    tz: TZ,
    games,
    facts: f,
    expect: {
      daily: playedDays(f, TZ)
        .reverse()
        .map((date) => ({ date, awards: dailyAwards(f, date, TZ) })),
      seasons: playedMonths(f, TZ)
        .reverse()
        .map((month) => season(f, month, TZ)),
      playerGames: playerGames(f).length,
    },
  };
}

const forced = (bidder: number, bid: number, team: number): KitHand => ({
  bidder,
  bid,
  team,
  // The first speaker is seat 0 here; everyone passes and the bid falls to `bidder` at the minimum.
  calls: [
    [0, 'pass'],
    [1, 'pass'],
    [2, 'pass'],
    [3, 'pass'],
    [0, 'forced'],
  ],
});

function build() {
  seq = 0;
  const out: Record<string, unknown> = {};

  out[`${PREFIX}achievements-moments`] = achievementsFixture(
    'every hand moment, with one deck and two, quick and full auctions; unfinished games too',
    [
      g(4, [
        { bidder: 0, bid: 200, team: 210 },
        { bidder: 1, bid: 250, team: 250 },
        { bidder: 2, bid: 200, team: 150 },
        { bidder: 3, bid: 180, team: 175 },
        { bidder: 0, bid: 160, team: 0 },
        lone(1),
        { bidder: 2, bid: 195, team: 190 },
      ]),
      g(4, [forced(1, 150, 160), forced(2, 150, 140), { bidder: 1, bid: 150, team: 160 }]),
      g(
        6,
        [
          { bidder: 0, bid: 170, playedBy: [3, 3], team: 180 },
          { bidder: 1, bid: 160, playedBy: [1, 1], team: 165 },
          { bidder: 2, bid: 170, playedBy: [4, 4], team: 160 },
          { bidder: 3, bid: 160, playedBy: [0, 5], team: 250 },
        ],
        { finished: false },
      ),
      g(7, [
        { bidder: 0, bid: 400, team: 410 },
        { bidder: 1, bid: 395, team: 300 },
        { bidder: 2, bid: 500, team: 500 },
        { bidder: 3, bid: 400, team: 395 },
        { bidder: 4, bid: 380, team: 0 },
      ]),
    ],
  );

  const comeback = [
    pair(1, 2),
    pair(1, 2),
    pair(1, 2),
    { bidder: 0, bid: 250, team: 250, playedBy: [3] },
    { bidder: 0, bid: 250, team: 250, playedBy: [3] },
    lone(0, 250),
  ];
  out[`${PREFIX}achievements-finish`] = achievementsFixture(
    'every game finish: ties, comeback, wire to wire, 1000s, night owl, full house, marathon',
    [
      g(4, [pair(0, 1), pair(2, 3)]),
      g(4, comeback),
      g(4, comeback.slice(1)),
      g(
        4,
        Array.from({ length: 6 }, () => lone(2)),
      ),
      g(
        4,
        Array.from({ length: 4 }, () => lone(0)),
        { length: 'to1000' },
      ),
      g(4, [lone(0), lone(0), lone(0), pair(1, 3), pair(1, 3), pair(1, 3)]),
      g(4, [lone(0), lone(0), miss(0), pair(2, 1), pair(2, 1)]),
      g(10, [lone(0, 350, 4)]),
      g(
        4,
        Array.from({ length: 20 }, (_, i) => lone(i % 4)),
      ),
      // 01:30 in Kolkata.
      g(5, [lone(4)], { start: Date.UTC(2026, 10, 20, 19, 54) }),
      g(5, [lone(4)], { start: Date.UTC(2026, 10, 21, 23, 40) }),
      g(4, [lone(0), lone(1)], { finished: false }),
    ],
  );

  const career: KtGame[] = [];
  // Ana wins five in a row, then loses; her bids run 3, break, then 8.
  for (let k = 0; k < 5; k++) career.push(g(4, [lone(0), pair(1, 2)]));
  career.push(g(4, [miss(0), lone(3)]));
  for (let k = 0; k < 4; k++) career.push(g(4, [lone(0), lone(0)]));
  // Ben and cy win as a pair until both reach Partners in Crime; dee and eli join to grow the hand count.
  for (let k = 0; k < 6; k++)
    career.push(
      g(6, [
        { bidder: 1, bid: 160, playedBy: [2, 3], team: 170 },
        { bidder: 1, bid: 160, playedBy: [2, 3], team: 170 },
      ]),
    );
  // A crew: ana meets ten people over a few tables.
  for (let k = 0; k < 3; k++)
    career.push(
      kitGame({
        id: `50000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
        players: ['ana', ...PEOPLE.slice(3 + 3 * k, 6 + 3 * k)],
        start: T0 + seq * DAY,
        finished: true,
        hands: [lone(1)],
      }),
    );
  // A long unfinished game: hands and partner wins count before a game ends.
  career.push(
    g(
      4,
      Array.from({ length: 80 }, (_, i) => pair(i % 2 ? 1 : 3, 2, i % 5 ? 160 : 100)),
      { finished: false },
    ),
  );
  out[`${PREFIX}achievements-career`] = achievementsFixture(
    'careers: win runs, games, hands, bids made, partner wins, bid streaks, crew, partners in crime',
    career,
  );

  // Two days of play, then two months of eight games each for the seasons.
  const days: KtGame[] = [
    g(4, [
      { bidder: 0, bid: 200, team: 210 },
      { bidder: 1, bid: 220, team: 100 },
      { bidder: 2, bid: 200, team: 205 },
      pair(3, 1),
      pair(3, 1),
      miss(0, 180, 120),
      lone(0),
      lone(0),
    ]),
    g(5, [miss(0), miss(0), lone(4), pair(1, 2), lone(1), lone(1)], { start: T0 + DAY + 3600e3 }),
    g(4, [lone(2)], { start: T0 + DAY + 7200e3, finished: false }),
  ];
  out[`${PREFIX}awards-days`] = awardsFixture(
    'daily awards over two days: ties share, single-hand bids, minimums',
    days,
  );

  const months: KtGame[] = [];
  const oct = Date.UTC(2026, 9, 1, 4, 30),
    nov = Date.UTC(2026, 10, 1, 4, 30);
  const monthOf = (start: number, winners: number[], extra: KitHand[]) =>
    winners.forEach((w, k) =>
      months.push(
        kitGame({
          id: `50000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
          players: PEOPLE.slice(0, 5),
          start: start + k * DAY,
          finished: true,
          hands: [lone(w, 200), ...(k < 2 ? extra : [])],
        }),
      ),
    );
  monthOf(oct, [0, 0, 0, 0, 1, 1, 2, 3], [pair(3, 4), pair(3, 4)]);
  monthOf(
    nov,
    [1, 1, 1, 1, 1, 0, 0, 2, 3],
    [...Array.from({ length: 8 }, () => lone(4)), pair(2, 3)],
  );
  out[`${PREFIX}awards-seasons`] = awardsFixture(
    'two months of win-rate seasons: podium, sharpest bidder, kingmaker, iron player, climber',
    months,
  );
  return out;
}

describe('Kaali Teeri achievements and awards fixtures for the backend', () => {
  const all = build();
  const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

  it('every game is one the server accepts', () => {
    for (const [file, fx] of Object.entries(all))
      for (const x of (fx as { games: KtGame[] }).games)
        expect(validate(x, Date.UTC(2027, 0, 1)), `${file} ${x.syncId}`).toBeNull();
  });

  it('every code of the catalogue is earned somewhere in the fixtures', async () => {
    const { KT_ACHIEVEMENTS } = await import('./achievements');
    const seen = new Set<string>();
    for (const fx of Object.values(all) as {
      expect: {
        games?: { earned: Earned[] }[];
        career?: Earned[];
        daily?: { awards: { code: string }[] }[];
        seasons?: { awards: { code: string }[] }[];
      };
    }[]) {
      for (const x of fx.expect.games ?? []) for (const e of x.earned) seen.add(e.code);
      for (const e of fx.expect.career ?? []) seen.add(e.code);
      for (const d of fx.expect.daily ?? []) for (const a of d.awards) seen.add(a.code);
      for (const s of fx.expect.seasons ?? []) for (const a of s.awards) seen.add(a.code);
    }
    // Ladders past their first steps would take thousands of hands; their rules are the steps' own.
    const big =
      /^(games_(50|100|250)|hands_(500|1000)|made_(50|100)|partner_(50|100)|crew_25|dynasty)$/;
    const missing = KT_ACHIEVEMENTS.map((a) => a.code).filter((c) => !seen.has(c) && !big.test(c));
    expect(missing).toEqual([]);
  });

  it(
    process.env.EXPORT_FIXTURES
      ? `writes contract/fixtures/${PREFIX}*`
      : `contract/fixtures/${PREFIX}* match the rules`,
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
          .filter((f) => f.startsWith(PREFIX) && f.endsWith('.json'))
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
