// Characterisation tests: written against the prototype's logic.js and kept unchanged by the TS port.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TRUMPS,
  maxFor,
  playerCounts,
  cycleLen,
  cardsFor,
  clone,
  newRound,
  roundAt,
  curRound,
  bidOrder,
  doneRounds,
  forbiddenFor,
  sumBids,
  pts,
  totals,
  standings,
  streaks,
  totalRounds,
  resultsState,
  gameStats,
  demoGame,
} from './index';

const SEQ = {
  10: [3, 4, 5, 6, 7, 8, 9, 10, 10, 9, 8, 7, 6, 5, 4, 3],
  8: [3, 4, 5, 6, 7, 8, 8, 7, 6, 5, 4, 3],
  7: [3, 4, 5, 6, 7, 7, 6, 5, 4, 3],
};

const mkPlayers = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i, emoji: 'x', color: 'c' }));
const mkGame = (n, over = {}) => ({
  id: 'g',
  createdAt: 0,
  updatedAt: 0,
  players: mkPlayers(n),
  direction: 'cw',
  firstDealerIndex: 0,
  maxCards: maxFor(n, 1),
  lengthMode: 'endless',
  rounds: [],
  status: 'active',
  ui: { view: 'round', bidIdx: 0 },
  ...over,
});
const finished = (g, i, bids, made) => {
  const r = newRound(g, i);
  g.players.forEach((p, k) => {
    r.bids[p.id] = bids[k];
    r.results[p.id] = made[k] ? 'made' : 'missed';
  });
  r.phase = 'done';
  g.rounds.push(r);
  return r;
};

describe('players and cards', () => {
  it.each([
    [3, 10],
    [4, 10],
    [5, 10],
    [6, 8],
    [7, 7],
  ])('%i players deal at most %i cards from one deck', (n, max) => {
    expect(maxFor(n, 1)).toBe(max);
  });

  // 104 cards: every hand of 10 fits up to 10 players, then the most that fits shrinks.
  it.each([
    [3, 10],
    [7, 10],
    [10, 10],
    [11, 9],
    [12, 8],
    [13, 8],
    [14, 7],
  ])('%i players deal at most %i cards from two decks', (n, max) => {
    expect(maxFor(n, 2)).toBe(max);
  });

  it('never deals more cards than the decks hold, nor fewer than the 3-card opening round', () => {
    for (const decks of [1, 2])
      for (const n of playerCounts(decks)) {
        expect(maxFor(n, decks) * n).toBeLessThanOrEqual(52 * decks);
        expect(maxFor(n, decks)).toBeGreaterThanOrEqual(3);
      }
  });

  it.each([
    [1, [3, 4, 5, 6, 7]],
    [2, [3, 4, 5, 6, 7, 8, 9, 10]],
  ])('%i deck(s) seat %j players', (decks, counts) => {
    expect(playerCounts(decks)).toEqual(counts);
  });

  it.each([
    [10, 16],
    [8, 12],
    [7, 10],
  ])('max %i has a cycle of %i rounds', (max, len) => {
    expect(cycleLen(max)).toBe(len);
  });

  it.each(Object.entries(SEQ))(
    'max %s zig-zags 3 → max → 3 with max and 3 repeated once',
    (max, seq) => {
      const m = Number(max);
      const two = Array.from({ length: cycleLen(m) * 2 }, (_, i) => cardsFor(i, m));
      expect(two).toEqual([...seq, ...seq]);
    },
  );

  it('repeats max once and 3 once', () => {
    const s = Array.from({ length: 34 }, (_, i) => cardsFor(i, 10));
    expect(s.slice(7, 10)).toEqual([10, 10, 9]);
    expect(s.slice(14, 18)).toEqual([4, 3, 3, 4]);
  });
});

describe('rotation', () => {
  it('rotates trump spades → diamonds → clubs → hearts', () => {
    expect(TRUMPS).toEqual(['spades', 'diamonds', 'clubs', 'hearts']);
    const g = mkGame(4);
    expect([0, 1, 2, 3, 4, 5].map((i) => newRound(g, i).trump)).toEqual([
      'spades',
      'diamonds',
      'clubs',
      'hearts',
      'spades',
      'diamonds',
    ]);
  });

  it('moves the dealer one seat per round, wrapping, starting at firstDealerIndex', () => {
    const g = mkGame(5, { firstDealerIndex: 3 });
    expect([0, 1, 2, 3, 4, 5, 6].map((i) => newRound(g, i).dealerIndex)).toEqual([
      3, 4, 0, 1, 2, 3, 4,
    ]);
  });

  it('makes the player after the dealer the first bidder and leader', () => {
    const g = mkGame(5, { firstDealerIndex: 3 });
    expect([0, 1, 2, 3].map((i) => newRound(g, i).firstPlayerIndex)).toEqual([4, 0, 1, 2]);
  });

  it('does not use the direction for dealer or first player (seat order already encodes it)', () => {
    const cw = mkGame(5, { direction: 'cw' }),
      ccw = mkGame(5, { direction: 'ccw' });
    for (let i = 0; i < 7; i++) {
      const a = newRound(cw, i),
        b = newRound(ccw, i);
      expect([a.dealerIndex, a.firstPlayerIndex]).toEqual([b.dealerIndex, b.firstPlayerIndex]);
    }
  });

  it('derives card counts per round from the game max', () => {
    const g = mkGame(6);
    expect([0, 1, 5, 6, 7, 12].map((i) => newRound(g, i).cards)).toEqual([3, 4, 8, 8, 7, 3]);
  });

  it('builds an empty bidding round', () => {
    const r = newRound(mkGame(4), 2);
    expect(r).toEqual({
      index: 2,
      cards: 5,
      trump: 'clubs',
      dealerIndex: 2,
      firstPlayerIndex: 3,
      bids: {},
      results: {},
      tricks: null,
      hookHits: 0,
      phase: 'bidding',
    });
  });

  it('roundAt returns the stored round or derives a future one', () => {
    const g = mkGame(4);
    g.rounds.push(newRound(g, 0));
    expect(roundAt(g, 0)).toBe(g.rounds[0]);
    expect(roundAt(g, 3)).toEqual({
      index: 3,
      cards: 6,
      trump: 'hearts',
      dealerIndex: 3,
      firstPlayerIndex: 0,
    });
  });

  it('curRound is the last round and doneRounds filters by phase', () => {
    const g = mkGame(3);
    finished(g, 0, [1, 1, 0], [1, 0, 1]);
    g.rounds.push(newRound(g, 1));
    expect(curRound(g).index).toBe(1);
    expect(doneRounds(g).map((r) => r.index)).toEqual([0]);
  });
});

describe('bidding', () => {
  it('bids start after the dealer and the dealer bids last', () => {
    const g = mkGame(5, { firstDealerIndex: 2 });
    const r = newRound(g, 0);
    expect(bidOrder(g, r)).toEqual([3, 4, 0, 1, 2]);
    expect(bidOrder(g, r).at(-1)).toBe(r.dealerIndex);
  });

  it('has no forbidden bid until every other player has bid', () => {
    const g = mkGame(4),
      r = newRound(g, 0); // dealer p0, 3 cards
    r.bids = { p1: 1, p2: 1 };
    expect(forbiddenFor(g, r)).toBeNull();
  });

  it('forbids cards − sum(others) when it is within 0..cards', () => {
    const g = mkGame(4),
      r = newRound(g, 0);
    r.bids = { p1: 1, p2: 1, p3: 0 };
    expect(forbiddenFor(g, r)).toBe(1);
    r.bids = { p1: 0, p2: 0, p3: 0 };
    expect(forbiddenFor(g, r)).toBe(3);
  });

  it('forbids nothing when the others already bid more than the cards', () => {
    const g = mkGame(4),
      r = newRound(g, 0);
    r.bids = { p1: 2, p2: 2, p3: 0 };
    expect(forbiddenFor(g, r)).toBeNull();
  });

  it('ignores the dealer’s own bid when computing the forbidden number', () => {
    const g = mkGame(4),
      r = newRound(g, 0);
    r.bids = { p0: 3, p1: 1, p2: 1, p3: 0 };
    expect(forbiddenFor(g, r)).toBe(1);
  });

  it('sums bids', () => {
    expect(sumBids({ bids: { a: 2, b: 0, c: 3 } })).toBe(5);
    expect(sumBids({ bids: {} })).toBe(0);
  });
});

describe('scoring', () => {
  const r = {
    bids: { a: 0, b: 1, c: 3, d: 7, e: 2 },
    results: { a: 'made', b: 'missed', c: 'made', d: 'missed' },
  };

  it('scores max(bid, 1) × 10, positive when made and negative when missed', () => {
    expect(pts(r, 'a')).toBe(10);
    expect(pts(r, 'b')).toBe(-10);
    expect(pts(r, 'c')).toBe(30);
    expect(pts(r, 'd')).toBe(-70);
  });

  it('has no score without a result or a bid', () => {
    expect(pts(r, 'e')).toBeNull();
    expect(pts(r, 'zz')).toBeNull();
  });

  it('totals only finished rounds by default and can take an explicit round list', () => {
    const g = mkGame(3);
    finished(g, 0, [1, 2, 0], [1, 0, 1]);
    const open = newRound(g, 1);
    open.bids = { p0: 5 };
    open.results = { p0: 'made' };
    g.rounds.push(open);
    expect(totals(g)).toEqual({ p0: 10, p1: -20, p2: 10 });
    expect(totals(g, [])).toEqual({ p0: 0, p1: 0, p2: 0 });
    expect(totals(g, [open])).toEqual({ p0: 50, p1: 0, p2: 0 });
  });

  it('recalculates every later total when a past round is edited', () => {
    const g = mkGame(3);
    finished(g, 0, [1, 2, 0], [1, 0, 1]);
    finished(g, 1, [2, 2, 1], [0, 1, 1]);
    expect(totals(g)).toEqual({ p0: -10, p1: 0, p2: 20 });
    const e = clone(g);
    e.rounds[0].bids.p0 = 4;
    e.rounds[0].results.p1 = 'made';
    expect(totals(e)).toEqual({ p0: 20, p1: 40, p2: 20 });
    expect(totals(g)).toEqual({ p0: -10, p1: 0, p2: 20 });
  });
});

describe('standings', () => {
  it('uses competition ranking for ties (1, 1, 3)', () => {
    const g = mkGame(4);
    finished(g, 0, [1, 1, 1, 1], [1, 1, 0, 0]);
    const s = standings(g);
    expect(s.map((x) => [x.p.id, x.t, x.rank])).toEqual([
      ['p0', 10, 1],
      ['p1', 10, 1],
      ['p2', -10, 3],
      ['p3', -10, 3],
    ]);
  });

  it('skips ranks after a tie and keeps seat order within it', () => {
    const g = mkGame(5);
    finished(g, 0, [3, 2, 2, 1, 1], [1, 1, 1, 0, 0]);
    expect(standings(g).map((x) => [x.p.id, x.rank])).toEqual([
      ['p0', 1],
      ['p1', 2],
      ['p2', 2],
      ['p3', 4],
      ['p4', 4],
    ]);
  });

  it('ranks everyone first before any round is finished', () => {
    expect(standings(mkGame(3)).map((x) => x.rank)).toEqual([1, 1, 1]);
  });

  it('can rank an explicit round list', () => {
    const g = mkGame(3);
    const a = finished(g, 0, [1, 1, 1], [1, 0, 0]);
    finished(g, 1, [1, 1, 1], [0, 1, 1]);
    expect(standings(g, [a]).map((x) => x.p.id)).toEqual(['p0', 'p1', 'p2']);
    expect(standings(g).map((x) => x.p.id)).toEqual(['p0', 'p1', 'p2']);
  });
});

describe('results validation', () => {
  const g = mkGame(3),
    mk = (results, tricks = null) => ({
      ...newRound(g, 0),
      results,
      tricks,
      bids: { p0: 1, p1: 1, p2: 1 },
    });

  it('is not ok until every player has a result', () => {
    expect(resultsState(g, mk({ p0: 'made' }))).toEqual({
      all: false,
      msg: '',
      ok: false,
      exact: false,
    });
  });

  it('blocks "all players made"', () => {
    const s = resultsState(g, mk({ p0: 'made', p1: 'made', p2: 'made' }));
    expect(s.ok).toBe(false);
    expect(s.msg).toBe("Someone has to miss — the bids can't all be right. Check again.");
  });

  it('accepts a mix of made and missed', () => {
    expect(resultsState(g, mk({ p0: 'made', p1: 'missed', p2: 'made' })).ok).toBe(true);
  });

  it('exact-tricks mode requires the total tricks to equal the cards dealt', () => {
    const bad = resultsState(
      g,
      mk({ p0: 'made', p1: 'missed', p2: 'missed' }, { p0: 1, p1: 1, p2: 0 }),
    );
    expect(bad).toMatchObject({ ok: false, exact: true, msg: 'Tricks add up to 2 — should be 3.' });
    expect(
      resultsState(g, mk({ p0: 'made', p1: 'missed', p2: 'missed' }, { p0: 1, p1: 2, p2: 0 })).ok,
    ).toBe(true);
  });

  it('reports the tricks mismatch before the all-made message', () => {
    const s = resultsState(g, mk({ p0: 'made', p1: 'made', p2: 'made' }, { p0: 1, p1: 1, p2: 0 }));
    expect(s.msg).toBe('Tricks add up to 2 — should be 3.');
  });
});

describe('game length', () => {
  it.each([
    ['endless', 10, Infinity],
    ['1cycle', 10, 16],
    ['2cycles', 10, 32],
    ['1cycle', 8, 12],
    ['2cycles', 7, 20],
  ])('%s with max %i lasts %s rounds', (lengthMode, maxCards, n) => {
    expect(totalRounds({ lengthMode, maxCards })).toBe(n);
  });
});

describe('streaks and stats', () => {
  it('counts the current run of exact bids at the end of the finished rounds', () => {
    const g = mkGame(3);
    finished(g, 0, [1, 1, 1], [1, 1, 0]);
    finished(g, 1, [1, 1, 1], [1, 0, 0]);
    finished(g, 2, [1, 1, 1], [1, 1, 0]);
    expect(streaks(g)).toEqual({ p0: 3, p1: 1, p2: 0 });
  });

  it('computes highlights, breaking ties toward the first seat', () => {
    const g = demoGame();
    const S = gameStats(g);
    expect(S.sharp.p.name).toBe('Kabir');
    expect(S.sharp.exact).toBe(5);
    expect(S.big.p.name).toBe('Aarav');
    expect(S.big.best).toBe(20);
    expect(S.streak.p.name).toBe('Aarav');
    expect(S.streak.maxRun).toBe(3);
    expect(S.hook.p.name).toBe('Meera');
    expect(S.hook.hook).toBe(2);
    expect(S.ouch.p.name).toBe('Aarav');
    expect(S.ouch.worst).toBe(-30);
  });

  it('credits hook hits to the dealer of the round', () => {
    const g = mkGame(3);
    const r = finished(g, 1, [1, 1, 1], [1, 0, 0]);
    r.hookHits = 4;
    expect(gameStats(g).hook.p.id).toBe('p1');
    expect(gameStats(g).hook.hook).toBe(4);
  });
});

describe('clone', () => {
  it('deep copies', () => {
    const a = { x: { y: [1, 2] } },
      b = clone(a);
    b.x.y.push(3);
    expect(a.x.y).toEqual([1, 2]);
  });
});

describe('demo game', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('has 5 players, 6 finished rounds and round 7 in bidding', () => {
    const g = demoGame();
    expect(g.players.map((p) => p.name)).toEqual(['Aarav', 'Riya', 'Kabir', 'Meera', 'Dev']);
    expect(doneRounds(g)).toHaveLength(6);
    const r = curRound(g);
    expect(r).toMatchObject({
      index: 6,
      cards: 9,
      trump: 'clubs',
      phase: 'bidding',
      bids: { p2: 2, p3: 3 },
    });
    expect(g.players[r.dealerIndex].name).toBe('Riya');
    expect(g.ui).toEqual({ view: 'round', bidIdx: 2 });
  });

  it('has the verified totals: Kabir 60, Dev 30, Aarav 10, Riya −20, Meera −30', () => {
    const s = standings(demoGame());
    expect(s.map((x) => [x.p.name, x.t, x.rank])).toEqual([
      ['Kabir', 60, 1],
      ['Dev', 30, 2],
      ['Aarav', 10, 3],
      ['Riya', -20, 4],
      ['Meera', -30, 5],
    ]);
  });

  it('timestamps itself relative to now', () => {
    const g = demoGame();
    expect(g.createdAt).toBe(Date.now() - 3600e3);
    expect(g.updatedAt).toBe(Date.now() - 12 * 60e3);
  });

  it('has an endless, clockwise game with a max of 10 cards', () => {
    expect(demoGame()).toMatchObject({
      id: 'demo',
      direction: 'cw',
      firstDealerIndex: 0,
      maxCards: 10,
      lengthMode: 'endless',
      status: 'active',
    });
  });
});
