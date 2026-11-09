import { T0, kitGame, type KitHand } from './__fixtures__/kit';
import { validate, type KtGame } from './index';

const NOW = T0 + 864e5;
const MIN = 60e3;
const P4 = ['a', 'b', 'c', 'd'];

const base = (hands: KitHand[] = [{ bidder: 0, bid: 180, team: 190 }], players = P4) =>
  kitGame({ id: 'x', players, start: T0, hands });
const check = (g: KtGame) => validate(g, NOW);
const spoilt = (spoil: (g: KtGame) => void, g = base()) => {
  spoil(g);
  return check(g);
};

describe('validate: accepted games', () => {
  it('a finished game, an active one and an empty one', () => {
    expect(check(base())).toBe(null);
    expect(check(kitGame({ id: 'x', players: P4, start: T0, hands: [], finished: false }))).toBe(
      null,
    );
    expect(
      check(
        kitGame({
          id: 'x',
          players: P4,
          start: T0,
          hands: [{ bidder: 1, bid: 150, team: 0 }],
          finished: true,
        }),
      ),
    ).toBe(null);
  });

  it('every phase of the hand in play', () => {
    expect(check(fresh('bidding'))).toBe(null);
    expect(check(fresh('calling'))).toBe(null);
    expect(check(fresh('playing'))).toBe(null);
    expect(check(fresh('result'))).toBe(null);
    const r = fresh('result');
    r.hands[0].teamPoints = 100;
    r.hands[0].countedBy = 'bidders';
    expect(check(r)).toBe(null);
  });

  it('a calling hand may have trump and some cards already', () => {
    const g = fresh('calling');
    g.hands[0].trump = 'clubs';
    expect(check(g)).toBe(null);
    g.hands[0].called = [{ rank: 'A', suit: 'hearts' }];
    g.hands[0].playedBy = [null];
    expect(check(g)).toBe(null);
  });

  it('an auction in progress, a finished one and a forced minimum', () => {
    const g = fresh('bidding');
    g.hands[0].mode = 'auction';
    g.hands[0].calls = [{ playerId: 'p1', bid: 160 }];
    expect(check(g)).toBe(null);
    const a = base([
      {
        bidder: 2,
        bid: 165,
        team: 200,
        calls: [
          [0, 160],
          [1, 165],
          [2, 'pass'],
          [3, 'pass'],
          [0, 'pass'],
        ],
      },
    ]);
    expect(check(a)).toBe(null);
    const f = base([
      {
        bidder: 1,
        bid: 150,
        team: 200,
        calls: [
          [0, 'pass'],
          [1, 'pass'],
          [2, 'pass'],
          [3, 'pass'],
          [0, 'forced'],
        ],
      },
    ]);
    expect(check(f)).toBe(null);
  });

  it('two decks with a single-copy card and “the other one”', () => {
    const g = base(
      [
        {
          bidder: 0,
          bid: 360,
          called: [
            { rank: '2', suit: 'hearts' },
            { rank: 'A', suit: 'hearts', copy: 'other' },
            { rank: 'K', suit: 'clubs', copy: 2 },
          ],
          playedBy: [0, 4, 0],
          team: 380,
        },
      ],
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
    );
    expect(check(g)).toBe(null);
  });
});

/** One hand at the given phase, on its own four-player table. */
function fresh(phase: 'bidding' | 'calling' | 'playing' | 'result') {
  const g = base([{ bidder: 0, bid: 180, phase, playedBy: [null] }]);
  const h = g.hands[0];
  if (phase === 'bidding')
    Object.assign(h, { bidder: null, bid: null, trump: null, called: [], playedBy: [] });
  if (phase === 'calling') Object.assign(h, { trump: null, called: [], playedBy: [] });
  return g;
}

describe('validate: reasons', () => {
  it('players', () => {
    expect(check(base(undefined, ['a', 'b', 'c']))).toEqual({ reason: 'players', handIndex: null });
    expect(spoilt((g) => (g.players[1].name = ' '))).toEqual({
      reason: 'players',
      handIndex: null,
    });
    expect(spoilt((g) => (g.players[1].name = 'x'.repeat(15)))).toMatchObject({
      reason: 'players',
    });
    expect(spoilt((g) => (g.players[1].id = 'p0'))).toMatchObject({ reason: 'players' });
    expect(spoilt((g) => (g.players[1].playerId = 'a'))).toMatchObject({ reason: 'players' });
    expect(spoilt((g) => delete g.players[1].playerId)).toBe(null);
    const eleven = kitGame({ id: 'x', players: 'abcdefghijk'.split(''), start: T0, hands: [] });
    expect(check(eleven)).toMatchObject({ reason: 'players' });
  });

  it('rules', () => {
    expect(spoilt((g) => (g.rules.decks = 2))).toEqual({ reason: 'rules', handIndex: null });
    expect(spoilt((g) => (g.rules.partners = 2))).toMatchObject({ reason: 'rules' });
    expect(spoilt((g) => (g.rules.minBid = 125))).toMatchObject({ reason: 'rules' });
  });

  it('dealer', () => {
    expect(spoilt((g) => (g.firstDealerIndex = 4))).toEqual({ reason: 'dealer', handIndex: null });
    expect(spoilt((g) => (g.firstDealerIndex = 1.5))).toMatchObject({ reason: 'dealer' });
    expect(spoilt((g) => (g.direction = 'up' as 'cw'))).toMatchObject({ reason: 'dealer' });
    expect(spoilt((g) => (g.hands[0].dealerIndex = 1))).toEqual({ reason: 'dealer', handIndex: 0 });
  });

  it('hands: order, phases and the end of the game', () => {
    const two = () =>
      base([
        { bidder: 0, bid: 180, team: 190 },
        { bidder: 1, bid: 180, team: 190 },
      ]);
    expect(spoilt((g) => (g.hands[1].index = 5), two())).toEqual({ reason: 'hands', handIndex: 1 });
    expect(spoilt((g) => (g.hands[0].phase = 'result'), two())).toEqual({
      reason: 'hands',
      handIndex: 0,
    });
    expect(spoilt((g) => (g.hands[0].phase = 'later' as 'done'))).toEqual({
      reason: 'hands',
      handIndex: 0,
    });
    const f = kitGame({
      id: 'x',
      players: P4,
      start: T0,
      finished: true,
      hands: [{ bidder: 0, bid: 180, phase: 'playing' }],
    });
    expect(check(f)).toEqual({ reason: 'hands', handIndex: 0 });
    const won = Array.from({ length: 5 }, () => ({ bidder: 0, bid: 245, team: 245 }));
    const over = kitGame({
      id: 'x',
      players: P4,
      start: T0,
      length: 'to1000',
      hands: [...won, { bidder: 1, bid: 150, phase: 'bidding' }],
    });
    expect(check(over)).toEqual({ reason: 'hands', handIndex: 5 });
    const ended = kitGame({
      id: 'x',
      players: P4,
      start: T0,
      length: 'to1000',
      finished: true,
      hands: won,
    });
    expect(check(ended)).toBe(null);
  });

  it('auction', () => {
    expect(spoilt((g) => (g.hands[0].calls = [{ playerId: 'p1', pass: true }]))).toEqual({
      reason: 'auction',
      handIndex: 0,
    });
    expect(spoilt((g) => (g.hands[0].mode = 'loud' as 'quick'))).toMatchObject({
      reason: 'auction',
    });
    const bad = base([
      {
        bidder: 1,
        bid: 160,
        team: 190,
        calls: [
          [0, 160],
          [1, 155],
        ],
      },
    ]);
    expect(check(bad)).toEqual({ reason: 'auction', handIndex: 0 });
    const open = base([
      {
        bidder: 0,
        bid: 160,
        team: 190,
        calls: [
          [0, 160],
          [1, 'pass'],
        ],
      },
    ]);
    expect(check(open)).toEqual({ reason: 'auction', handIndex: 0 });
  });

  it('bid', () => {
    expect(spoilt((g) => (g.hands[0].bid = 145))).toEqual({ reason: 'bid', handIndex: 0 });
    expect(spoilt((g) => (g.hands[0].bid = 152))).toMatchObject({ reason: 'bid' });
    expect(spoilt((g) => (g.hands[0].bidder = 'zz'))).toMatchObject({ reason: 'bid' });
    expect(spoilt((g) => (g.hands[0].bidder = null))).toMatchObject({ reason: 'bid' });
    const a = base([
      {
        bidder: 2,
        bid: 160,
        team: 190,
        calls: [
          [0, 160],
          [1, 'pass'],
          [2, 'pass'],
          [3, 'pass'],
        ],
      },
    ]);
    expect(check(a)).toEqual({ reason: 'bid', handIndex: 0 });
    const b = base([
      {
        bidder: 1,
        bid: 165,
        team: 190,
        calls: [
          [0, 160],
          [1, 'pass'],
          [2, 'pass'],
          [3, 'pass'],
        ],
      },
    ]);
    expect(check(b)).toEqual({ reason: 'bid', handIndex: 0 });
    const early = fresh('bidding');
    early.hands[0].bidder = 'p0';
    expect(check(early)).toEqual({ reason: 'bid', handIndex: 0 });
  });

  it('trump', () => {
    expect(spoilt((g) => (g.hands[0].trump = null))).toEqual({ reason: 'trump', handIndex: 0 });
    expect(spoilt((g) => (g.hands[0].trump = 'stars' as 'clubs'))).toMatchObject({
      reason: 'trump',
    });
    const early = fresh('bidding');
    early.hands[0].trump = 'clubs';
    expect(check(early)).toEqual({ reason: 'trump', handIndex: 0 });
  });

  it('called', () => {
    expect(
      spoilt(
        (g) => (g.hands[0].called = [{ rank: '2', suit: 'clubs' }]),
        base(undefined, ['a', 'b', 'c', 'd', 'e']),
      ),
    ).toEqual({
      reason: 'called',
      handIndex: 0,
    });
    expect(spoilt((g) => g.hands[0].called.push({ rank: 'K', suit: 'clubs' }))).toMatchObject({
      reason: 'called',
    });
    const early = fresh('bidding');
    early.hands[0].called = [{ rank: 'A', suit: 'hearts' }];
    early.hands[0].playedBy = [null];
    expect(check(early)).toEqual({ reason: 'called', handIndex: 0 });
    const calling = fresh('calling');
    calling.hands[0].called = [{ rank: 'A', suit: 'hearts', copy: 1 }];
    calling.hands[0].playedBy = [null];
    expect(check(calling)).toEqual({ reason: 'called', handIndex: 0 });
  });

  it('played_by', () => {
    expect(spoilt((g) => (g.hands[0].playedBy = [null]))).toEqual({
      reason: 'played_by',
      handIndex: 0,
    });
    expect(spoilt((g) => (g.hands[0].playedBy = ['zz']))).toMatchObject({ reason: 'played_by' });
    expect(spoilt((g) => (g.hands[0].playedBy = []))).toMatchObject({ reason: 'played_by' });
    const other = base(
      [
        {
          bidder: 0,
          bid: 360,
          called: [
            { rank: 'A', suit: 'hearts', copy: 'other' },
            { rank: 'K', suit: 'hearts', copy: 1 },
          ],
          playedBy: [0, 1],
          team: 400,
        },
      ],
      ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    );
    expect(check(other)).toEqual({ reason: 'played_by', handIndex: 0 });
  });

  it('team_points', () => {
    expect(spoilt((g) => (g.hands[0].teamPoints = null))).toEqual({
      reason: 'team_points',
      handIndex: 0,
    });
    expect(spoilt((g) => (g.hands[0].teamPoints = 192))).toMatchObject({ reason: 'team_points' });
    expect(spoilt((g) => (g.hands[0].teamPoints = 255))).toMatchObject({ reason: 'team_points' });
    expect(spoilt((g) => (g.hands[0].teamPoints = -5))).toMatchObject({ reason: 'team_points' });
    expect(spoilt((g) => (g.hands[0].countedBy = null))).toMatchObject({ reason: 'team_points' });
    expect(spoilt((g) => (g.hands[0].countedBy = 'both' as 'bidders'))).toMatchObject({
      reason: 'team_points',
    });
    const early = fresh('playing');
    early.hands[0].teamPoints = 100;
    expect(check(early)).toEqual({ reason: 'team_points', handIndex: 0 });
    const r = fresh('result');
    r.hands[0].teamPoints = 101;
    expect(check(r)).toEqual({ reason: 'team_points', handIndex: 0 });
  });

  it('times', () => {
    expect(spoilt((g) => (g.updatedAt = NOW + 11 * MIN))).toEqual({
      reason: 'times',
      handIndex: null,
    });
    expect(spoilt((g) => (g.hands[0].doneAt = T0 - MIN))).toEqual({
      reason: 'times',
      handIndex: 0,
    });
    expect(spoilt((g) => (g.hands[0].doneAt = g.updatedAt + 6 * MIN))).toEqual({
      reason: 'times',
      handIndex: 0,
    });
    expect(spoilt((g) => (g.hands[0].doneAt = g.updatedAt + 4 * MIN))).toBe(null);
    expect(spoilt((g) => delete g.hands[0].doneAt)).toBe(null);
    expect(validate(base())).toBe(null);
  });
});
