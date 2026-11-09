import { T0, kitGame } from './__fixtures__/kit';
import {
  demoGame,
  gamePlayerRows,
  handRows,
  headToHead,
  playerKey,
  playerStats,
  summary,
  validate,
} from './index';

const DAY = 864e5;
/** b wins A; e wins B; b is forced at the minimum in the live game and misses. */
const A = kitGame({
  id: 'A',
  players: ['a', 'b', 'c', 'd'],
  start: T0,
  finished: true,
  hands: [
    { bidder: 0, bid: 180, playedBy: [1], team: 190 },
    { bidder: 1, bid: 200, playedBy: [1], team: 210 },
    { bidder: 0, bid: 160, playedBy: [2], team: 100 },
    { bidder: 2, bid: 150, playedBy: [0], team: 250 },
  ],
});
const B = kitGame({
  id: 'B',
  players: ['a', 'b', 'c', 'e'],
  start: T0 + DAY,
  finished: true,
  firstDealer: 3,
  hands: [
    { bidder: 2, bid: 150, playedBy: [0], team: 0 },
    { bidder: 0, bid: 170, playedBy: [3], team: 200 },
  ],
});
const live = kitGame({
  id: 'L',
  players: ['a', 'b', 'c', 'd'],
  start: T0 + 2 * DAY,
  hands: [
    {
      bidder: 1,
      bid: 150,
      team: 40,
      calls: [
        [0, 'pass'],
        [1, 'pass'],
        [2, 'pass'],
        [3, 'pass'],
        [0, 'forced'],
      ],
    },
    { bidder: 1, bid: 150, phase: 'playing' },
  ],
});
const empty = kitGame({ id: 'E', players: ['a', 'b', 'c', 'd'], start: T0, hands: [] });

describe('per-hand and per-game rows', () => {
  it('the fixtures are valid games', () => {
    for (const g of [A, B, live, empty]) expect(validate(g, T0 + 9 * DAY)).toBe(null);
  });

  it('player keys: the registry id, else the name', () => {
    expect(playerKey(A.players[0])).toBe('a');
    expect(playerKey({ id: 'p9', name: '  Riya  Shah ', emoji: '', color: '' })).toBe(
      'name:riya shah',
    );
  });

  it('hand rows', () => {
    const rows = handRows(A);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({
      handIndex: 0,
      dealerId: 'a',
      bidderId: 'a',
      bid: 180,
      forced: false,
      trump: 'hearts',
      partnerIds: ['b'],
      slots: { a: 1, b: 1 },
      teamPoints: 190,
      made: true,
      sweep: 'none',
      doneAt: A.hands[0].doneAt,
    });
    expect(rows[1]).toMatchObject({ partnerIds: [], slots: { b: 2 }, made: true });
    expect(rows[2]).toMatchObject({ made: false, sweep: 'none' });
    expect(rows[3]).toMatchObject({ forced: false, sweep: 'bidders', partnerIds: ['a'] });
    expect(handRows(live)).toHaveLength(1);
    expect(handRows(live)[0]).toMatchObject({ forced: true, made: false, bidderId: 'b' });
    const noTime = { ...A, hands: [{ ...A.hands[0], doneAt: undefined }] };
    expect(handRows(noTime)[0].doneAt).toBe(null);
  });

  it('game player rows', () => {
    expect(gamePlayerRows(A)).toEqual([
      {
        playerId: 'a',
        points: 430,
        place: 2,
        won: false,
        handsBid: 2,
        bidsMade: 1,
        timesPartner: 1,
        partnerMade: 1,
        doubleSlots: 0,
        sweeps: 1,
      },
      {
        playerId: 'b',
        points: 740,
        place: 1,
        won: true,
        handsBid: 1,
        bidsMade: 1,
        timesPartner: 1,
        partnerMade: 1,
        doubleSlots: 1,
        sweeps: 0,
      },
      {
        playerId: 'c',
        points: 250,
        place: 3,
        won: false,
        handsBid: 1,
        bidsMade: 1,
        timesPartner: 1,
        partnerMade: 0,
        doubleSlots: 0,
        sweeps: 1,
      },
      {
        playerId: 'd',
        points: 160,
        place: 4,
        won: false,
        handsBid: 0,
        bidsMade: 0,
        timesPartner: 0,
        partnerMade: 0,
        doubleSlots: 0,
        sweeps: 0,
      },
    ]);
    expect(gamePlayerRows(live).map((r) => [r.place, r.won])).toEqual([
      [null, false],
      [null, false],
      [null, false],
      [null, false],
    ]);
  });

  it('summary', () => {
    expect(summary(A)).toEqual({
      kind: 'kaali-teeri',
      status: 'finished',
      hands: 4,
      length: 'endless',
      players: A.players.map((p, i) => ({
        playerId: p.playerId,
        name: p.name,
        emoji: p.emoji,
        color: p.color,
        points: [430, 740, 250, 160][i],
        place: [2, 1, 3, 4][i],
      })),
    });
    const s = summary({ ...live, players: live.players.map(({ playerId: _, ...p }) => p) });
    expect(s.players.map((p) => [p.playerId, p.place])).toEqual([
      [null, null],
      [null, null],
      [null, null],
      [null, null],
    ]);
    expect(s.hands).toBe(1);
  });
});

describe('§6 player stats', () => {
  const games = [B, live, A, empty];

  it('a bidder and partner across two games', () => {
    expect(playerStats(games, 'a')).toEqual({
      games: 3,
      wins: 0,
      winRate: 0,
      avgPlace: 2.5,
      points: 750,
      bestGame: { gameId: 'A', points: 430 },
      handsBid: 3,
      bidsMade: 2,
      madeRate: 2 / 3,
      avgBid: 170,
      highestMade: 180,
      handsLost: 1,
      sweeps: 1,
      timesPartner: 2,
      partnerMade: 1,
      partnerWinRate: 0.5,
      doubleSlots: 0,
      mostPartner: { playerId: 'c', hands: 3, made: 1 },
      madeStreak: { current: 1, best: 1 },
    });
  });

  it('wins, double slots and a defenders’ sweep', () => {
    expect(playerStats(games, 'b')).toMatchObject({
      wins: 1,
      winRate: 0.5,
      handsBid: 2,
      bidsMade: 1,
      madeRate: 0.5,
      doubleSlots: 1,
      sweeps: 1,
      timesPartner: 1,
      partnerMade: 1,
      madeStreak: { current: 0, best: 1 },
    });
    expect(playerStats(games, 'e')).toMatchObject({ games: 1, wins: 1, avgPlace: 1 });
  });

  it('streaks run in play order across games', () => {
    const later = kitGame({
      id: 'Z',
      players: ['a', 'b', 'c', 'd'],
      start: T0 + 5 * DAY,
      hands: [
        { bidder: 0, bid: 150, team: 200 },
        { bidder: 0, bid: 150, team: 200 },
      ],
    });
    expect(playerStats([later, ...games], 'a').madeStreak).toEqual({ current: 3, best: 3 });
  });

  it('nobody known: zeros and nulls', () => {
    expect(playerStats(games, 'zz')).toEqual({
      games: 0,
      wins: 0,
      winRate: null,
      avgPlace: null,
      points: 0,
      bestGame: null,
      handsBid: 0,
      bidsMade: 0,
      madeRate: null,
      avgBid: null,
      highestMade: null,
      handsLost: 0,
      sweeps: 0,
      timesPartner: 0,
      partnerMade: 0,
      partnerWinRate: null,
      doubleSlots: 0,
      mostPartner: null,
      madeStreak: { current: 0, best: 0 },
    });
  });

  it('head to head', () => {
    expect(headToHead(games, 'a', 'b')).toEqual({
      games: 3,
      aAhead: 0,
      bAhead: 2,
      level: 0,
      together: 1,
      togetherMade: 1,
      aBidAgainstB: 2,
      aMadeAgainstB: 1,
      bBidAgainstA: 2,
      bMadeAgainstA: 1,
    });
    expect(headToHead(games, 'd', 'e')).toMatchObject({ games: 0, aAhead: 0, bAhead: 0 });
    const tie = kitGame({
      id: 'T',
      players: ['a', 'b', 'c', 'd'],
      start: T0,
      finished: true,
      hands: [{ bidder: 0, bid: 150, team: 150 }],
    });
    expect(headToHead([tie], 'a', 'b')).toMatchObject({ level: 1, together: 1 });
  });
});

describe('demo game', () => {
  it('is a valid game part-way through a hand', () => {
    const g = demoGame();
    expect(validate(g, g.updatedAt)).toBe(null);
    expect(g.hands.filter((h) => h.phase === 'done').length).toBeGreaterThan(2);
    expect(g.hands.at(-1)!.phase).not.toBe('done');
    expect(g.hands.some((h) => h.mode === 'auction')).toBe(true);
  });
});
