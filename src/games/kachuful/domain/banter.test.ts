import { describe, expect, it } from 'vitest';
import { maxFor, newRound, type Game, type Outcome } from './index';
import { banterLog, pickIndex, type Mark } from './banter';

const mkGame = (n: number): Game => ({
  id: 'g',
  syncId: 'g',
  rev: 1,
  createdAt: 0,
  updatedAt: 0,
  players: Array.from({ length: n }, (_, i) => ({
    id: 'p' + i,
    name: 'P' + i,
    emoji: 'x',
    color: 'c',
  })),
  direction: 'cw',
  firstDealerIndex: 0,
  decks: 1,
  maxCards: maxFor(n, 1),
  order: 'up',
  lengthMode: 'endless',
  rounds: [],
  status: 'active',
  ui: { view: 'round', bidIdx: 0 },
});

type Seat = [bid: number, made: boolean];

/** One done round per entry; `hook` adds a hook hit on that round's dealer. */
const play = (n: number, rounds: { seats: Seat[]; hook?: boolean }[]) => {
  const g = mkGame(n);
  rounds.forEach(({ seats, hook }, i) => {
    const r = newRound(g, i);
    seats.forEach(([bid, made], k) => {
      r.bids['p' + k] = bid;
      r.results['p' + k] = (made ? 'made' : 'missed') as Outcome;
    });
    if (hook) r.hookHits = 1;
    r.phase = 'done';
    g.rounds.push(r);
  });
  return g;
};

const gold = new Map<string, Mark>([['p0', 'gold']]);
const kinds = (g: Game, marks = gold) => banterLog(g, marks).map((b) => b?.kind ?? null);

describe('banter about the Badshah', () => {
  it('calls the only miss at a table of four', () => {
    const g = play(4, [
      {
        seats: [
          [1, false],
          [1, true],
          [1, true],
          [1, true],
        ],
      },
    ]);
    expect(banterLog(g, gold)[0]).toEqual({ kind: 'soleMiss', who: 'p0', mark: 'gold' });
  });

  it('names the player without a medal who made a bigger bid', () => {
    const g = play(3, [
      {
        seats: [
          [1, false],
          [3, true],
          [2, true],
        ],
      },
    ]);
    expect(banterLog(g, gold)[0]).toEqual({ kind: 'outbid', who: 'p0', mark: 'gold', other: 'p1' });
  });

  it('notices two misses in a row, then a plain miss', () => {
    const miss: Seat[] = [
      [2, false],
      [1, false],
      [1, false],
    ];
    expect(kinds(play(3, [{ seats: miss }, { seats: miss }, { seats: miss }]))).toEqual([
      'miss',
      'missTwice',
      // Both kinds were heard in the last two rounds; nothing else fits.
      null,
    ]);
  });

  it('teases the hook on the dealer, and praises big, lone and nil bids', () => {
    // Round 0's dealer is seat 0 with firstDealerIndex 0.
    expect(
      kinds(
        play(3, [
          {
            seats: [
              [1, true],
              [1, true],
              [1, true],
            ],
            hook: true,
          },
        ]),
      ),
    ).toEqual(['hooked']);
    expect(
      kinds(
        play(3, [
          {
            seats: [
              [5, true],
              [1, true],
              [1, true],
            ],
          },
        ]),
      ),
    ).toEqual(['bigMake']);
    expect(
      kinds(
        play(3, [
          {
            seats: [
              [1, true],
              [1, false],
              [1, false],
            ],
          },
        ]),
      ),
    ).toEqual(['soleMake']);
    expect(
      kinds(
        play(3, [
          {
            seats: [
              [0, true],
              [1, true],
              [1, true],
            ],
          },
        ]),
      ),
    ).toEqual(['nilMake']);
  });

  it('stays quiet on an ordinary made bid and with nobody marked', () => {
    const g = play(3, [
      {
        seats: [
          [1, true],
          [1, true],
          [1, true],
        ],
      },
    ]);
    expect(kinds(g)).toEqual([null]);
    expect(kinds(g, new Map())).toEqual([null]);
  });
});

describe('the other marks', () => {
  it('puts the Badshah before the Sitara', () => {
    const marks = new Map<string, Mark>([
      ['p1', 'sitara'],
      ['p0', 'gold'],
    ]);
    const g = play(3, [
      {
        seats: [
          [1, false],
          [1, false],
          [1, true],
        ],
      },
    ]);
    expect(banterLog(g, marks)[0]).toMatchObject({ who: 'p0', mark: 'gold' });
  });

  it('never teases a Legend, only praises', () => {
    const marks = new Map<string, Mark>([['p0', 'legend']]);
    expect(
      kinds(
        play(3, [
          {
            seats: [
              [2, false],
              [1, true],
              [1, true],
            ],
          },
        ]),
        marks,
      ),
    ).toEqual([null]);
    expect(
      kinds(
        play(3, [
          {
            seats: [
              [6, true],
              [1, true],
              [1, true],
            ],
          },
        ]),
        marks,
      ),
    ).toEqual(['bigMake']);
  });

  it('cheers a Wazir who passes the Badshah in the game score', () => {
    const marks = new Map<string, Mark>([
      ['p0', 'gold'],
      ['p1', 'silver'],
    ]);
    // p0 +20 then +10 (30); p1 +10 then +40 (50): p1 passes in round 2.
    const g = play(3, [
      {
        seats: [
          [2, true],
          [1, true],
          [1, true],
        ],
      },
      {
        seats: [
          [1, true],
          [4, true],
          [1, true],
        ],
      },
    ]);
    // Round 1 has no tease for p0 (made 1), so the pass is the line.
    expect(banterLog(g, marks)[1]).toEqual({
      kind: 'passed',
      who: 'p1',
      mark: 'silver',
      other: 'p0',
      otherMark: 'gold',
    });
  });
});

describe('the pick', () => {
  it('is stable and in range', () => {
    expect(pickIndex('g:3', 4)).toBe(pickIndex('g:3', 4));
    for (const s of ['a', 'b', 'c', 'g:0', 'g:1']) expect(pickIndex(s, 4)).toBeLessThan(4);
    expect(pickIndex('x', 0)).toBe(0);
  });
});
