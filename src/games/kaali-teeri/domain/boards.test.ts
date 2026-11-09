import { T0, kitGame } from './__fixtures__/kit';
import {
  endedAt,
  ktLeaderboard,
  ktTallies,
  MIN_BIDS,
  opponents,
  periodRange,
  playerGames,
  roster,
  validate,
  type KtGame,
} from './index';

const DAY = 864e5,
  MIN = 60e3;
/** a wins: a's bid made, then b's missed. Totals a 380, b 180, c 0, d 200. */
const G1 = kitGame({
  id: 'G1',
  players: ['a', 'b', 'c', 'd'],
  start: T0,
  finished: true,
  hands: [
    { bidder: 0, bid: 180, playedBy: [1], team: 190 },
    { bidder: 1, bid: 200, playedBy: [2], team: 100 },
  ],
});
/** c wins: c's team sweeps, then a's team is swept. Totals a 250, b 250, c 500, e 0. */
const G2 = kitGame({
  id: 'G2',
  players: ['a', 'b', 'c', 'e'],
  start: T0 + DAY,
  finished: true,
  hands: [
    { bidder: 2, bid: 150, playedBy: [0], team: 250 },
    { bidder: 0, bid: 160, playedBy: [3], team: 0 },
  ],
});
/** In play: a made 150 with b; the next hand is being played. */
const L = kitGame({
  id: 'L',
  players: ['a', 'b', 'c', 'd'],
  start: T0 + 2 * DAY,
  hands: [
    { bidder: 0, bid: 150, playedBy: [1], team: 150 },
    { bidder: 1, bid: 150, phase: 'playing' },
  ],
});
const E = kitGame({ id: 'E', players: ['a', 'b', 'c', 'd'], start: T0, hands: [] });
const ALL = [G1, G2, L, E];
const ever = { from: 0, to: T0 + 9 * DAY };

describe('periods', () => {
  const now = T0 + 2 * DAY + 3600e3;
  it('today, the last 7 days, this month (the season) and all time, as Kachuful ranges them', () => {
    expect(periodRange('today', now, 'UTC')).toEqual({
      from: Date.UTC(2026, 10, 3),
      to: Date.UTC(2026, 10, 4),
    });
    expect(periodRange('week', now, 'UTC')).toEqual({
      from: Date.UTC(2026, 9, 28),
      to: Date.UTC(2026, 10, 4),
    });
    expect(periodRange('season', now, 'UTC')).toEqual({
      from: Date.UTC(2026, 10, 1),
      to: Date.UTC(2026, 11, 1),
    });
    expect(periodRange('all', now, 'UTC')).toEqual({ from: 0, to: Date.UTC(2026, 10, 4) });
  });

  it('a game ends when it finished; an active game has not ended', () => {
    expect(endedAt(G1)).toBe(G1.finishedAt);
    expect(endedAt({ ...G1, finishedAt: undefined })).toBe(G1.updatedAt);
    expect(endedAt(L)).toBe(null);
  });
});

describe('tallies', () => {
  it('the fixtures are valid games', () => {
    for (const g of ALL) expect(validate(g, T0 + 9 * DAY)).toBe(null);
  });

  it('all time: games with a hand done, wins of ended games, points, bids and bids made', () => {
    const t = ktTallies(ALL, ever.from, ever.to);
    expect(Object.fromEntries(t)).toEqual({
      a: { playerId: 'a', games: 3, wins: 1, points: 780, handsBid: 3, bidsMade: 2 },
      b: { playerId: 'b', games: 3, wins: 0, points: 580, handsBid: 1, bidsMade: 0 },
      c: { playerId: 'c', games: 3, wins: 1, points: 500, handsBid: 1, bidsMade: 1 },
      d: { playerId: 'd', games: 2, wins: 0, points: 200, handsBid: 0, bidsMade: 0 },
      e: { playerId: 'e', games: 1, wins: 0, points: 0, handsBid: 0, bidsMade: 0 },
    });
  });

  it('a game counts where its first hand was done, points where each hand was, a win where it ended', () => {
    const t = ktTallies([G1], T0 + 7 * MIN, T0 + DAY);
    expect(t.get('a')).toEqual({
      playerId: 'a',
      games: 0,
      wins: 1,
      points: 200,
      handsBid: 0,
      bidsMade: 0,
    });
    expect(t.get('b')).toMatchObject({ games: 0, handsBid: 1, bidsMade: 0, points: 0 });
  });

  it('today: only the game in play', () => {
    const { from, to } = periodRange('today', T0 + 2 * DAY + 3600e3, 'UTC');
    const t = ktTallies(ALL, from, to);
    expect([...t.keys()]).toEqual(['a', 'b', 'c', 'd']);
    expect(t.get('a')).toMatchObject({ games: 1, points: 150, handsBid: 1, bidsMade: 1, wins: 0 });
  });

  it('a hand saved without its time counts at the game’s last change', () => {
    const old: KtGame = {
      ...G1,
      hands: G1.hands.map((h) => ({ ...h, doneAt: undefined })),
      updatedAt: T0 + 3 * DAY,
      finishedAt: undefined,
    };
    expect(ktTallies([old], T0, T0 + DAY).size).toBe(0);
    expect(ktTallies([old], T0 + 3 * DAY, T0 + 4 * DAY).get('a')).toMatchObject({
      games: 1,
      wins: 1,
      points: 380,
    });
  });
});

describe('leaderboard', () => {
  const ids = (rows: { playerId: string; rank: number | null }[]) =>
    rows.map((r) => [r.playerId, r.rank]);

  it('by points', () => {
    const rows = ktLeaderboard(ALL, { ...ever, sort: 'points' });
    expect(ids(rows)).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
      ['d', 4],
      ['e', 5],
    ]);
    expect(rows[0]).toMatchObject({ value: 780, qualified: true, madeRate: 2 / 3 });
    expect(rows[3].madeRate).toBe(null);
  });

  it('by wins: ties share a rank and list by points', () => {
    expect(ids(ktLeaderboard(ALL, { ...ever, sort: 'wins' }))).toEqual([
      ['a', 1],
      ['c', 1],
      ['b', 3],
      ['d', 3],
      ['e', 3],
    ]);
  });

  it(`by made %: fewer than ${MIN_BIDS} bids is unranked, listed by rate then points`, () => {
    const rows = ktLeaderboard(ALL, { ...ever, sort: 'made' });
    expect(ids(rows)).toEqual([
      ['c', null],
      ['a', null],
      ['b', null],
      ['d', null],
      ['e', null],
    ]);
    expect(rows.every((r) => !r.qualified)).toBe(true);
    expect(rows[1].value).toBeCloseTo(2 / 3);
  });

  it('by made % with a lower minimum: a player with no bid never ranks', () => {
    const rows = ktLeaderboard(ALL, { ...ever, sort: 'made', minBids: 0 });
    expect(ids(rows)).toEqual([
      ['c', 1],
      ['a', 2],
      ['b', 3],
      ['d', null],
      ['e', null],
    ]);
  });

  it('equal on value and points: listed by id, sharing the rank', () => {
    expect(ids(ktLeaderboard([G1], { from: T0, to: T0 + 7 * MIN, sort: 'points' }))).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 3],
      ['d', 3],
    ]);
  });

  it('an empty period is an empty board', () => {
    expect(ktLeaderboard(ALL, { from: 0, to: T0, sort: 'points' })).toEqual([]);
  });
});

describe('players, their games and who they sat with', () => {
  it('roster: most games first, then by name, with their latest look', () => {
    const later = { ...L, players: L.players.map((p) => ({ ...p, emoji: '🦊' })) };
    for (const order of [
      [G1, G2, later, E],
      [later, G2, G1, E],
    ]) {
      const r = roster(order);
      expect(r.map((x) => [x.playerId, x.games])).toEqual([
        ['a', 3],
        ['b', 3],
        ['c', 3],
        ['d', 2],
        ['e', 1],
      ]);
      expect(r[0].player.emoji).toBe('🦊');
      expect(r[0].lastAt).toBe(L.updatedAt);
    }
  });

  it('a player’s games, newest first; places only for ended games', () => {
    expect(playerGames(ALL, 'a')).toEqual([
      { gameId: 'L', at: L.updatedAt, ended: false, place: null, points: 150, hands: 1 },
      { gameId: 'G2', at: G2.finishedAt, ended: true, place: 2, points: 250, hands: 2 },
      { gameId: 'G1', at: G1.finishedAt, ended: true, place: 1, points: 380, hands: 2 },
    ]);
    expect(playerGames(ALL, 'e').map((x) => x.gameId)).toEqual(['G2']);
    expect(playerGames(ALL, 'nobody')).toEqual([]);
  });

  it('opponents: by games shared', () => {
    expect(opponents(ALL, 'a')).toEqual([
      { playerId: 'b', games: 3 },
      { playerId: 'c', games: 3 },
      { playerId: 'd', games: 2 },
      { playerId: 'e', games: 1 },
    ]);
    expect(opponents(ALL, 'e').map((x) => x.playerId)).toEqual(['a', 'b', 'c']);
  });
});
