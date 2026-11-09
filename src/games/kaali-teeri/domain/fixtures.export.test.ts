import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { kitGame, type KitGame, type KitHand } from './__fixtures__/kit';
import {
  auction,
  gameOver,
  gamePlayerRows,
  handRows,
  handScore,
  headToHead,
  playerKey,
  playerStats,
  speakingOrder,
  standings,
  summary,
  totals,
  validate,
  type CardRef,
  type KtGame,
} from './index';

/**
 * Kaali Teeri's golden fixtures for the backend (contract/README.md). `EXPORT_FIXTURES=1 npx vitest run
 * src/games/kaali-teeri/domain/fixtures.export.test.ts` rewrites contract/fixtures/kt-*.json; otherwise this checks
 * the committed files still match the rules.
 */
const DIR = path.resolve(import.meta.dirname, '../../../../contract/fixtures');
const T0 = Date.UTC(2026, 10, 1, 13, 30);
const NOW = T0 + 40 * 864e5;
const DAY = 864e5;
const PEOPLE = ['ana', 'ben', 'cy', 'dee', 'eli', 'fay', 'gus', 'hal', 'ivy', 'jo'];

let seq = 0;
const g = (n: number, hands: KitHand[], k: Partial<KitGame> = {}) =>
  kitGame({
    id: `40000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
    players: PEOPLE.slice(0, n),
    start: T0 + seq * DAY,
    finished: true,
    hands,
    ...k,
  });
const card = (rank: CardRef['rank'], suit: CardRef['suit'], copy?: CardRef['copy']): CardRef => ({
  rank,
  suit,
  ...(copy && { copy }),
});

function gameFixture(name: string, game: KtGame) {
  const v = validate(game, NOW);
  const key = Object.fromEntries(game.players.map((p) => [p.id, playerKey(p)]));
  const ids = game.players.map((p) => p.id);
  return {
    kind: 'game',
    name,
    game,
    expect: v
      ? { valid: false, reason: v.reason, handIndex: v.handIndex }
      : {
          valid: true,
          totals: totals(game),
          places:
            game.status === 'finished'
              ? Object.fromEntries(standings(game).map((s) => [s.p.id, s.rank]))
              : null,
          gameOver: gameOver(game),
          auctions: game.hands.map((h, i) =>
            h.mode === 'auction' ? auction(h.calls, speakingOrder(game, i), game.rules) : null,
          ),
          hands: handRows(game).map((row) => {
            const s = handScore(game.hands[row.handIndex], game.rules, ids);
            return { ...row, scores: Object.fromEntries(ids.map((id) => [key[id], s[id]])) };
          }),
          gamePlayers: gamePlayerRows(game),
          summary: summary(game),
        },
  };
}

function setFixture(name: string, games: KtGame[]) {
  const keys = [...new Set(games.flatMap((x) => x.players.map(playerKey)))].sort();
  return {
    kind: 'set',
    name,
    games,
    expect: {
      players: Object.fromEntries(keys.map((k) => [k, playerStats(games, k)])),
      headToHead: keys.flatMap((a, i) =>
        keys.slice(i + 1).map((b) => ({ a, b, ...headToHead(games, a, b) })),
      ),
    },
  };
}

function build() {
  seq = 0;
  const out: Record<string, unknown> = {};
  const add = (file: string, name: string, game: KtGame) =>
    (out[`kt-${file}`] = gameFixture(name, game));

  add(
    '4p',
    '4 players, 1 deck, 1 partner, nothing taken out',
    g(
      4,
      [
        { bidder: 0, bid: 160, team: 170 },
        { bidder: 2, bid: 180, team: 150 },
        { bidder: 3, bid: 200, team: 205, countedBy: 'bidders' },
        { bidder: 1, bid: 150, team: 150 },
      ],
      { firstDealer: 1 },
    ),
  );
  add(
    '5p',
    '5 players: 2♣ 2♦ out; 2♥ still callable',
    g(5, [
      { bidder: 4, bid: 155, team: 160 },
      { bidder: 1, bid: 170, playedBy: [3], team: 120 },
      { bidder: 2, bid: 190, called: [card('2', 'hearts')], playedBy: [0], team: 195 },
    ]),
  );
  add(
    '6p',
    '6 players, 2 partners; active with a hand at the result',
    g(
      6,
      [
        { bidder: 0, bid: 165, team: 200 },
        { bidder: 3, bid: 175, playedBy: [1, 5], team: 100 },
        { bidder: 5, bid: 150, team: 150 },
        { bidder: 2, bid: 160, phase: 'result' },
      ],
      { finished: false },
    ),
  );
  add(
    '7p',
    '7 players, 2 decks, both copies of every 2 but 2♠ out',
    g(7, [
      { bidder: 0, bid: 360, team: 400 },
      {
        bidder: 6,
        bid: 380,
        called: [card('A', 'hearts', 2), card('10', 'clubs', 1)],
        playedBy: [2, 4],
        team: 300,
      },
    ]),
  );
  add(
    '9p',
    '9 players: one 2♥ left, called without a copy; both A♠ called',
    g(9, [
      {
        bidder: 4,
        bid: 355,
        called: [card('2', 'hearts'), card('A', 'spades', 1), card('A', 'spades', 2)],
        playedBy: [0, 7, 8],
        team: 420,
      },
      { bidder: 8, bid: 400, team: 390 },
    ]),
  );
  add(
    '10p',
    '10 players, 4 partners, bid step 10',
    g(
      10,
      [
        { bidder: 9, bid: 350, team: 360 },
        { bidder: 3, bid: 450, team: 455, countedBy: 'bidders' },
      ],
      { step: 10 },
    ),
  );
  add('quick-mode', 'quick mode: only the winning bid', g(4, [{ bidder: 2, bid: 185, team: 190 }]));
  add(
    'full-auction',
    'the full auction, turn by turn',
    g(5, [
      {
        bidder: 4,
        bid: 170,
        team: 175,
        calls: [
          [0, 150],
          [1, 160],
          [2, 'pass'],
          [3, 170],
          [4, 'pass'],
          [0, 'pass'],
          [1, 'pass'],
          [2, 'pass'],
        ],
      },
    ]),
  );
  add(
    'reentry',
    'a player bids again after passing',
    g(4, [
      {
        bidder: 2,
        bid: 170,
        team: 210,
        calls: [
          [0, 150],
          [1, 'pass'],
          [2, 'pass'],
          [3, 160],
          [0, 'pass'],
          [1, 170],
          [2, 'pass'],
          [3, 'pass'],
          [0, 'pass'],
        ],
      },
    ]),
  );
  add(
    'forced',
    'everyone passed: the first speaker takes it at the minimum',
    g(4, [
      {
        bidder: 1,
        bid: 150,
        team: 130,
        calls: [
          [0, 'pass'],
          [1, 'pass'],
          [2, 'pass'],
          [3, 'pass'],
          [0, 'forced'],
        ],
      },
    ]),
  );
  add(
    'other-one',
    '“the other one” called with two decks',
    g(8, [
      {
        bidder: 0,
        bid: 360,
        called: [card('A', 'hearts', 'other'), card('K', 'spades', 1), card('K', 'spades', 2)],
        playedBy: [5, 2, 6],
        team: 380,
      },
    ]),
  );
  add(
    'counted-by',
    'points entered by the defenders, then by the bidding team',
    g(4, [
      { bidder: 0, bid: 180, team: 190, countedBy: 'defenders' },
      { bidder: 1, bid: 180, team: 190, countedBy: 'bidders' },
    ]),
  );
  add(
    'missed',
    'a missed bid pays each defender the bid',
    g(6, [{ bidder: 1, bid: 200, team: 195 }]),
  );
  add(
    'double-slot',
    'a partner played both called cards: 2× on a made bid',
    g(6, [{ bidder: 0, bid: 170, playedBy: [3, 3], team: 180 }]),
  );
  add(
    'bidder-holds',
    'the bidder played one called card (2×), then both (3×)',
    g(6, [
      { bidder: 2, bid: 165, playedBy: [2, 4], team: 170 },
      { bidder: 0, bid: 160, playedBy: [0, 0], team: 165 },
    ]),
  );
  add(
    'sweep-bidders',
    'the bidding team takes 250: 250 each, slots ignored',
    g(6, [{ bidder: 0, bid: 160, playedBy: [0, 3], team: 250 }]),
  );
  add(
    'sweep-defenders',
    'the bidding team takes 0: 500 to each defender',
    g(7, [{ bidder: 0, bid: 350, team: 0 }]),
  );
  add(
    'bid-250',
    'a 250 bid that takes everything is a sweep; one point short is a miss',
    g(4, [
      { bidder: 0, bid: 250, team: 250 },
      { bidder: 3, bid: 250, team: 245 },
    ]),
  );
  const edited = g(4, [
    { bidder: 0, bid: 180, team: 175, countedBy: 'bidders' },
    { bidder: 1, bid: 160, team: 200 },
    { bidder: 2, bid: 170, team: 120 },
  ]);
  edited.rev = 4;
  edited.updatedAt += 30 * 60e3;
  add('edit', 'hand 1 edited after hand 3: totals come from the hands', edited);
  add(
    'to-1000',
    'first to 1000: ends after the hand that reaches it',
    g(
      4,
      [
        ...Array.from({ length: 4 }, () => ({ bidder: 0, bid: 245, team: 245 })),
        { bidder: 2, bid: 150, team: 250 },
        { bidder: 0, bid: 150, team: 150 },
      ],
      { length: 'to1000' },
    ),
  );

  const spoil = (reason: string, f: (x: KtGame) => void, n = 4) => {
    const x = g(n, [
      { bidder: 0, bid: 180, team: 190 },
      { bidder: 1, bid: 160, team: 100 },
    ]);
    f(x);
    out[`kt-invalid-${reason}`] = gameFixture(`rejected: ${reason}`, x);
  };
  spoil('players', (x) => (x.players[1].name = ''));
  spoil('rules', (x) => (x.rules.minBid = 125));
  spoil('dealer', (x) => (x.hands[1].dealerIndex = 0));
  spoil('hands', (x) => (x.hands[0].phase = 'result'));
  spoil('auction', (x) => (x.hands[1].calls = [{ playerId: 'p2', pass: true }]));
  spoil('bid', (x) => (x.hands[1].bid = 152));
  spoil('trump', (x) => (x.hands[1].trump = null));
  spoil('called', (x) => (x.hands[0].called = [card('2', 'clubs')]), 5);
  spoil('played_by', (x) => (x.hands[1].playedBy = [null]));
  spoil('team_points', (x) => (x.hands[1].teamPoints = 192));
  spoil('times', (x) => (x.hands[1].doneAt = NOW + 3600e3));

  const games = Object.values(out)
    .map((f) => f as { game: KtGame; expect: { valid: boolean } })
    .filter((f) => f.expect.valid)
    .map((f) => f.game);
  out['kt-set-stats'] = setFixture('every valid game above: player stats and head-to-head', games);
  return out;
}

describe('Kaali Teeri golden fixtures for the backend', () => {
  const all = build();
  const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n';

  it('every game fixture validates except the invalid ones, which fail for their reason', () => {
    for (const [file, fx] of Object.entries(all)) {
      const e = (fx as { expect: { valid?: boolean; reason?: string } }).expect;
      if (file.startsWith('kt-invalid-'))
        expect(e.reason, file).toBe(file.slice('kt-invalid-'.length));
      else if (file !== 'kt-set-stats') expect(e.valid, file).toBe(true);
    }
  });

  it(
    process.env.EXPORT_FIXTURES
      ? 'writes contract/fixtures/kt-*'
      : 'contract/fixtures/kt-* match the rules',
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
          .filter((f) => f.startsWith('kt-') && f.endsWith('.json'))
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
