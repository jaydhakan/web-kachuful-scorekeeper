import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { card, kitGame, NEWCOMER, T0, WHO, type KitEntry } from './__fixtures__/kit';
import { careerAchievements, gameAchievements, ladderCounts, tableAsGame } from './achievements';
import { dailyAwards, spSeason } from './awards';
import { allFacts } from './boards';
import type { Player } from '../../../people/types';
import type { Seat, SpGame, SpHand, SpPublic, SpResult, TrickRec } from './types';

/**
 * Spades' achievements and awards fixtures for the backend's golden tests (plan §8.6). Each file holds stored games of
 * either kind as the server keeps them (`payload`) and what the rules earn from them.
 * `EXPORT_FIXTURES=1 npx vitest run src/games/spades/domain/progression.export.test.ts` rewrites
 * contract/fixtures/spades-achievements-*.json and spades-awards-*.json; otherwise this fails on any drift.
 */
const DIR = path.resolve(import.meta.dirname, '../../../../contract/fixtures');
const TZ = 'Asia/Kolkata';
const H = 3600e3;

/** JSON with anything short kept on one line. */
function pretty(x: unknown, pad = ''): string {
  const flat = JSON.stringify(x);
  if (x === null || typeof x !== 'object' || flat.length + pad.length <= 200) return flat;
  const inner = pad + '  ';
  if (Array.isArray(x))
    return `[\n${x.map((v) => inner + pretty(v ?? null, inner)).join(',\n')}\n${pad}]`;
  const rows = Object.entries(x).filter(([, v]) => v !== undefined);
  return `{\n${rows.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${pretty(v, inner)}`).join(',\n')}\n${pad}}`;
}

function write(name: string, out: unknown) {
  const file = path.join(DIR, `spades-${name}.json`);
  const text = pretty(out) + '\n';
  if (process.env.EXPORT_FIXTURES) writeFileSync(file, text);
  expect(existsSync(file), `${file} is missing: run with EXPORT_FIXTURES=1`).toBe(true);
  expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(JSON.parse(text));
}

type Stored = { kind: 'spades'; payload: SpGame } | { kind: 'spades-online'; payload: SpPublic };
const asGame = (s: Stored) => (s.kind === 'spades' ? s.payload : tableAsGame(s.payload));
const sk = (payload: SpGame): Stored => ({ kind: 'spades', payload });
const on = (payload: SpPublic): Stored => ({ kind: 'spades-online', payload });

const gid = (n: number) => `80000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const pid = (n: number) => `90000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const person = (name: string, n: number): Player => ({
  id: `p-${name}`,
  name,
  emoji: '🙂',
  color: '#f5a524',
  playerId: pid(n),
});

/** A finished table-mode game (`n` names its id), its hands ten minutes apart from `start`. */
function game(
  n: number,
  hands: KitEntry[],
  o: {
    at?: number;
    winner?: SpResult['winner'] | null;
    endedBy?: SpResult['endedBy'];
    players?: Player[];
  } = {},
): SpGame {
  const start = o.at ?? T0 + n * 6 * H;
  const g = kitGame(hands, {
    syncId: gid(n),
    id: `g${n}`,
    ...(o.players && { players: o.players }),
  });
  const shift = start - T0;
  g.createdAt += shift;
  g.updatedAt += shift;
  for (const h of g.hands) if (h.doneAt) h.doneAt += shift;
  if (o.winner === null) return g;
  const winner = o.winner ?? 'a';
  return {
    ...g,
    status: 'finished',
    finishedAt: g.updatedAt,
    result: { winner, endedBy: o.endedBy ?? (winner === 'draw' ? 'draw' : 'target') },
  };
}

/** Winners for a hand's 13 tricks that match its team and Nil tricks: a Nil bidder's first, then a bidder's. */
function winnersOf(h: SpHand): Seat[] {
  const out: Seat[] = [];
  for (const [team, seats] of [
    [0, [0, 2]],
    [1, [1, 3]],
  ] as [number, Seat[]][]) {
    let left = h.teamTricks![team];
    for (const s of seats)
      if (h.bids[s] === 0) {
        const k = h.nilTricks[s] ?? 0;
        out.push(...Array<Seat>(k).fill(s));
        left -= k;
      }
    const bidder = seats.find((s) => h.bids[s] !== 0) ?? seats[0];
    out.push(...Array<Seat>(left).fill(bidder));
  }
  return out;
}

const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
/** Plausible tricks for given winners: each led in clubs by its winner, highest card the winner's. */
const tricksFor = (winners: Seat[], special: Record<number, TrickRec> = {}): TrickRec[] =>
  winners.map(
    (w, i) =>
      special[i] ?? {
        plays: [0, 1, 2, 3].map((k) => ({
          seat: ((w + k) % 4) as Seat,
          card: card(`${k ? RANKS[i % 10] : 'A'}c`),
        })),
        winner: w,
      },
  );

/** A table-mode game as an online table's stored payload, with every hand's tricks. */
function table(g: SpGame, special: Record<number, (h: SpHand) => TrickRec[]> = {}): SpPublic {
  return {
    kind: 'spades-online',
    schemaVersion: 1,
    id: g.syncId,
    code: 'KQ7M',
    name: 'Riya’s table',
    rev: g.rev,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    ...(g.finishedAt != null && { finishedAt: g.finishedAt }),
    status: g.status === 'active' ? 'playing' : g.status,
    paused: null,
    host: 0,
    rules: g.rules,
    seats: g.players.map((p) => ({
      who: {
        userId: `u-${p.name.toLowerCase()}`,
        playerId: p.playerId!,
        name: p.name,
        emoji: p.emoji,
        color: p.color,
        photoUrl: null,
      },
      ready: true,
      away: false,
      timeouts: 0,
    })),
    drawn: null,
    dealer: 0,
    phase: 'handEnd',
    bids: [null, null, null, null],
    blind: [false, false, false, false],
    looked: [false, false, false, false],
    trick: [],
    tricks: [],
    broken: false,
    turn: null,
    turnStartedAt: null,
    deadline: null,
    history: g.hands.map((h) => ({
      ...h,
      tricks: special[h.index]?.(h) ?? tricksFor(winnersOf(h)),
      players: g.players.map((p) => p.playerId ?? null),
    })),
    result: g.result ?? null,
    next: null,
  };
}

/** A replay from the online golden set, under its own id. */
function replay(name: string, id: string): SpPublic {
  const f = JSON.parse(readFileSync(path.join(DIR, `spades-${name}.json`), 'utf8'));
  return { ...(f.expect.state as SpPublic), id };
}

const B = { bids: [3, 3, 3, 3], teamA: 7 };

function achievementsFixture(name: string, games: Stored[]) {
  const all = games.map(asGame);
  const players = [...new Set(allFacts(all).map((r) => r.player))].sort();
  return {
    kind: 'spades-achievements',
    name,
    tz: TZ,
    games,
    expect: {
      games: all.map((g) => ({ gameId: g.syncId, earned: gameAchievements(g, TZ) })),
      career: careerAchievements(all),
      ladders: Object.fromEntries(players.map((p) => [p, ladderCounts(all, p)])),
    },
  };
}

function awardsFixture(name: string, games: Stored[], days: string[], months: string[]) {
  const all = games.map(asGame);
  return {
    kind: 'spades-awards',
    name,
    tz: TZ,
    games,
    expect: {
      daily: days.map((date) => ({ date, awards: dailyAwards(all, date, TZ) })),
      season: months.map((m) => spSeason(all, m, TZ)),
    },
  };
}

function moments() {
  return achievementsFixture(
    'every scorekeeper hand moment, a game in progress and a cancelled one',
    [
      sk(
        game(1, [
          { bids: [3, 4, 3, 4], teamA: 13 },
          { bids: [0, 4, 4, 4], teamA: 5, nil: [0, null, null, null] },
          {
            bids: [0, 4, 4, 4],
            blind: [true, false, false, false],
            teamA: 5,
            nil: [0, null, null, null],
          },
          { bids: [0, 6, 0, 6], teamA: 0, nil: [0, null, 0, null] },
          { bids: [3, 0, 4, 4], teamA: 7, nil: [null, 2, null, null] },
          { bids: [6, 1, 4, 1], teamA: 10 },
          { bids: [1, 1, 1, 1], teamA: 9 },
          {
            bids: [0, 4, 4, 4],
            blind: [true, false, false, false],
            teamA: 6,
            nil: [1, null, null, null],
          },
          { bids: [0, 6, 0, 6], teamA: 1, nil: [0, null, 1, null] },
        ]),
      ),
      sk(
        game(2, [B, { bids: [4, 3, 3, 3], teamA: 7 }, { bids: [3, 3, 3, 3], phase: 'bidding' }], {
          winner: null,
        }),
      ),
      sk({
        ...game(3, [{ bids: [3, 3, 3, 3], teamA: 13 }], { winner: null }),
        status: 'cancelled',
      }),
    ],
  );
}

function finishes() {
  const exact = { bids: [4, 3, 3, 3], teamA: 7 };
  const shut = { bids: [3, 3, 3, 3], teamA: 10 };
  const bags = { bids: [1, 1, 1, 1], teamA: 12 };
  return achievementsFixture('game finishes: every code, a draw, and night in Kolkata', [
    sk(
      game(11, [
        { bids: [5, 5, 5, 4], teamA: 0 },
        { bids: [4, 1, 4, 1], teamA: 13 },
      ]),
    ),
    sk(game(12, [exact, exact, exact, exact])),
    sk(game(13, [exact, exact, exact])),
    sk(game(14, [B], { endedBy: 'mercy' })),
    sk(game(15, [shut, shut, shut])),
    sk(game(16, [B, B, B, B, B])),
    sk(game(17, [{ bids: [3, 3, 3, 3], teamA: 6 }, B, B, B, B, B])),
    sk(
      game(18, [
        { bids: [5, 1, 5, 1], teamA: 12 },
        { bids: [5, 1, 5, 1], teamA: 12 },
      ]),
    ),
    sk(game(19, [bags, bags], { winner: 'b', endedBy: 'end' })),
    sk(
      game(
        20,
        Array.from({ length: 15 }, () => B),
        { winner: 'draw' },
      ),
    ),
    sk(game(21, [B], { at: Date.UTC(2026, 10, 16, 20, 30) })),
    sk(game(22, [B], { at: Date.UTC(2026, 10, 17, 0, 0) })),
  ]);
}

function online() {
  const deuce: TrickRec = {
    plays: [
      { seat: 1, card: card('Ah') },
      { seat: 2, card: card('Kh') },
      { seat: 3, card: card('Qh') },
      { seat: 0, card: card('2s') },
    ],
    winner: 0,
  };
  const g = game(31, [
    { bids: [3, 4, 3, 3], teamA: 6 },
    { bids: [6, 3, 1, 3], teamA: 8 },
    { bids: [3, 4, 3, 3], teamA: 6 },
    { bids: [0, 4, 3, 6], teamA: 3, nil: [0, null, null, null] },
  ]);
  const t = table(g, {
    // The contract reached on the last trick; then seven tricks to one seat; then the 2♠ over an Ace.
    0: () => tricksFor([0, 2, 0, 2, 0, 1, 3, 1, 3, 1, 3, 1, 2]),
    1: () => tricksFor([0, 0, 0, 0, 0, 0, 0, 2, 1, 3, 1, 3, 1]),
    2: () => tricksFor([2, 2, 2, 2, 0, 1, 3, 1, 3, 1, 3, 1, 3], { 4: deuce }),
    3: () => tricksFor([2, 2, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 2]),
  });
  // Arjun's seat was replaced for the first two hands.
  t.history[0].players = [WHO[0].playerId, NEWCOMER.playerId, WHO[2].playerId, WHO[3].playerId];
  t.history[1].players = t.history[0].players;
  const live = table(game(32, [B], { winner: null }));
  return achievementsFixture(
    'online tables: trick-by-trick codes, a replaced seat, and real replays',
    [
      on(t),
      on(live),
      on(replay('classic', gid(33))),
      on(replay('nil-blind', gid(34))),
      on(replay('bag-penalty', gid(35))),
      on(replay('mercy', gid(36))),
      on(replay('draw-game', gid(37))),
      on(replay('timeouts', gid(38))),
      on(replay('random-7', gid(39))),
      on(replay('random-42', gid(40))),
    ],
  );
}

function career() {
  const people = Array.from({ length: 12 }, (_, i) => person(`Guest ${i + 1}`, i + 1));
  const riya = kitGame([]).players[0];
  const out: Stored[] = [];
  let n = 100;
  // Eleven wins with Dev (a draw in the middle), 25 hands each: runs, games_10, hands_100, made_50, Perfect Pair.
  for (let i = 0; i < 12; i++)
    out.push(
      sk(
        game(
          ++n,
          Array.from({ length: 25 }, (_, k) =>
            k === 0 && i < 5
              ? { bids: [0, 3, 6, 3], teamA: 6, nil: [0, null, null, null] }
              : { bids: [3, 3, 3, 3], teamA: 6 },
          ),
          { winner: i === 3 ? 'draw' : 'a' },
        ),
      ),
    );
  // Riya meets twelve new people: Crew 10.
  for (let k = 0; k < 4; k++)
    out.push(
      sk(game(++n, [B], { winner: 'b', players: [riya, ...people.slice(k * 3, k * 3 + 3)] })),
    );
  // An online table where Arjun was replaced for a hand, and one in progress (no career).
  const t = table(game(++n, [B, B]));
  t.history[0].players = [WHO[0].playerId, NEWCOMER.playerId, WHO[2].playerId, WHO[3].playerId];
  out.push(on(t));
  out.push(sk(game(++n, [B], { winner: null })));
  return achievementsFixture(
    'careers: runs, every count ladder, crew, Perfect Pair, both kinds',
    out,
  );
}

function days() {
  const D = Date.UTC(2026, 10, 17, 4, 0);
  const g = (n: number, hands: KitEntry[], at: number, winner: SpResult['winner'] = 'a') =>
    game(n, hands, { at, winner });
  const set = { bids: [3, 5, 3, 5], teamA: 6 };
  const nil = { bids: [0, 3, 6, 3], teamA: 6, nil: [0, null, null, null] };
  const games: Stored[] = [
    sk(g(201, [B, set, set, nil, B], D)),
    sk(g(202, [B, { bids: [3, 3, 3, 3], teamA: 13 }, B], D + 2 * H)),
    sk(g(203, [{ bids: [2, 4, 2, 4], teamA: 9 }, B], D + 4 * H, 'b')),
    on(table(g(204, [B, { bids: [3, 3, 3, 3], teamA: 0 }, B, B], D + 6 * H, 'b'))),
    // The day before, just before Kolkata midnight; and one cancelled.
    sk(g(205, [B, B], Date.UTC(2026, 10, 16, 17, 0))),
    sk({ ...g(206, [B, set, set], D + 8 * H), status: 'cancelled', result: undefined }),
  ];
  return awardsFixture(
    'daily awards over three days, both kinds',
    games,
    ['2026-11-16', '2026-11-17', '2026-11-18'],
    [],
  );
}

function seasons() {
  const NOV = Date.UTC(2026, 10, 3, 6);
  const OCT = Date.UTC(2026, 9, 3, 6);
  const four = [B, B, B, { bids: [0, 3, 6, 3], teamA: 6, nil: [0, null, null, null] }];
  const out: Stored[] = [];
  let n = 300;
  for (let i = 0; i < 10; i++)
    out.push(sk(game(++n, four, { at: OCT + i * 6 * H, winner: i < 3 ? 'a' : 'b' })));
  for (let i = 0; i < 11; i++)
    out.push(
      sk(game(++n, four, { at: NOV + i * 6 * H, winner: i < 8 ? 'a' : i < 10 ? 'b' : 'draw' })),
    );
  // Kabir sits in for Dev three times in November (online): unranked, and Riya passes Dev.
  const kabir = { ...kitGame([]).players[2], name: NEWCOMER.name, playerId: NEWCOMER.playerId };
  for (let i = 0; i < 3; i++) {
    const p = kitGame([]).players;
    out.push(
      on(table(game(++n, [B], { at: NOV + (80 + i) * H, players: [p[0], p[1], kabir, p[3]] }))),
    );
  }
  return awardsFixture(
    'seasons: Oct and Nov by win rate, ties, the climber and the month awards',
    out,
    [],
    ['2026-09', '2026-10', '2026-11'],
  );
}

describe('Spades progression fixtures', () => {
  it('achievements: hand moments', () => write('achievements-moments', moments()));
  it('achievements: game finishes', () => write('achievements-finishes', finishes()));
  it('achievements: online tables', () => write('achievements-online', online()));
  it('achievements: careers', () => write('achievements-career', career()));
  it('awards: days', () => write('awards-days', days()));
  it('awards: seasons', () => write('awards-seasons', seasons()));

  it('cover what they are named for', () => {
    const got = (f: {
      expect: { games: { earned: { code: string }[] }[]; career: { code: string }[] };
    }) =>
      new Set([...f.expect.games.flatMap((g) => g.earned), ...f.expect.career].map((e) => e.code));
    const m = got(moments());
    for (const c of [
      'boston',
      'ice_cold',
      'blindside',
      'double_nil',
      'nil_breaker',
      'set_them',
      'high_roller',
      'bang_on',
      'sandbagged',
      'blind_spot',
    ])
      expect(m, c).toContain(c);
    const f = got(finishes());
    for (const c of [
      'winner',
      'comeback',
      'exact',
      'mercy',
      'shutout',
      'wire_to_wire',
      'photo_finish',
      'runaway',
      'bag_collector',
      'marathon',
      'night_owl',
    ])
      expect(f, c).toContain(c);
    const o = got(online());
    for (const c of ['last_gasp', 'deuce_ace', 'one_man_band']) expect(o, c).toContain(c);
    const c = got(career());
    for (const x of [
      'first_win',
      'back_to_back',
      'hat_trick',
      'dynasty',
      'games_10',
      'hands_100',
      'made_50',
      'nils_5',
      'crew_10',
      'perfect_pair',
    ])
      expect(c, x).toContain(x);
    const d = days().expect.daily.flatMap((x) => x.awards.map((a) => a.code));
    for (const x of [
      'day_pair',
      'day_sharp',
      'day_nil',
      'day_setter',
      'day_boston',
      'day_bags',
      'day_grinder',
    ])
      expect(d, x).toContain(x);
    const s = seasons().expect.season.flatMap((x) => x.awards.map((a) => a.code));
    for (const x of [
      'season_champion',
      'season_runner_up',
      'season_third',
      'season_sharpest',
      'season_nil',
      'season_pair',
      'season_iron',
      'season_climber',
    ])
      expect(s, x).toContain(x);
  });
});
