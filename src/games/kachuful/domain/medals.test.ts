import { describe, expect, it } from 'vitest';
import { maxFor, newRound, type Game } from './index';
import {
  chaseOf,
  defended,
  gameTallies,
  medalChanges,
  medalsOf,
  newBadshah,
  project,
  type MedalRow,
  type Medals,
} from './medals';

const row = (playerId: string, rank: number | null, value: number, rounds = 60): MedalRow => ({
  playerId,
  rank,
  qualified: rank != null,
  value,
  points: Math.round(value * rounds),
  rounds,
});

const month = [
  row('a', 1, 9),
  row('b', 2, 8),
  row('c', 3, 7),
  row('d', 4, 6),
  row('e', null, 20, 10),
];
const last = [row('x', 1, 9), row('y', 2, 8), row('z', 3, 7)];

describe('medals', () => {
  it('gives the top three their medals', () => {
    expect([...medalsOf(month, last)]).toEqual([
      ['a', { medal: 1, defending: false }],
      ['b', { medal: 2, defending: false }],
      ['c', { medal: 3, defending: false }],
    ]);
  });

  it('shares a medal on a tie', () => {
    const m = medalsOf([row('a', 1, 9), row('b', 1, 9), row('c', 3, 7)], last);
    expect(m.get('a')?.medal).toBe(1);
    expect(m.get('b')?.medal).toBe(1);
    expect(m.get('c')?.medal).toBe(3);
  });

  it("keeps last month's medallists, defending, until three qualify", () => {
    const m = medalsOf([row('a', 1, 9), row('b', 2, 8), row('e', null, 20, 10)], last);
    expect([...m.keys()]).toEqual(['x', 'y', 'z']);
    expect(m.get('x')).toEqual({ medal: 1, defending: true });
  });

  it('has no medals with no history at all', () => {
    expect(medalsOf([], []).size).toBe(0);
  });
});

describe('the projection', () => {
  it("adds this game's rounds and ranks as the board does", () => {
    const p = project(month, new Map([['d', { points: 400, rounds: 10 }]]), 50);
    // d: (360 + 400) / 70 = 10.9, past a's 9.
    expect(p[0]).toMatchObject({ playerId: 'd', rank: 1 });
    expect(p.find((r) => r.playerId === 'a')?.rank).toBe(2);
  });

  it('qualifies a player once they pass the minimum, and ranks a newcomer', () => {
    const p = project(
      month,
      new Map([
        ['e', { points: 0, rounds: 41 }],
        ['n', { points: 10, rounds: 1 }],
      ]),
      50,
    );
    expect(p.find((r) => r.playerId === 'e')).toMatchObject({ qualified: true, rank: 5 });
    expect(p.find((r) => r.playerId === 'n')).toMatchObject({ qualified: false, rank: null });
  });

  it("sums one game's rounds in a range by board id", () => {
    const g: Game = {
      id: 'g',
      syncId: 'g',
      rev: 1,
      createdAt: 0,
      updatedAt: 0,
      players: [
        { id: 'p0', name: 'Riya', emoji: 'x', color: 'c', playerId: 'R' },
        { id: 'p1', name: 'Dev', emoji: 'x', color: 'c' },
      ],
      direction: 'cw',
      firstDealerIndex: 0,
      decks: 1,
      maxCards: maxFor(2, 1),
      order: 'up',
      lengthMode: 'endless',
      rounds: [],
      status: 'active',
      ui: { view: 'round', bidIdx: 0 },
    };
    [100, 200].forEach((doneAt, i) => {
      const r = newRound(g, i);
      r.bids = { p0: 2, p1: 0 };
      r.results = { p0: 'made', p1: 'missed' };
      r.phase = 'done';
      r.doneAt = doneAt;
      g.rounds.push(r);
    });
    expect(gameTallies(g, 0, 150)).toEqual(
      new Map([
        ['R', { points: 20, rounds: 1 }],
        ['name:dev', { points: -10, rounds: 1 }],
      ]),
    );
  });
});

const held: Medals = new Map([
  ['a', { medal: 1, defending: false }],
  ['b', { medal: 2, defending: false }],
  ['c', { medal: 3, defending: false }],
]);

describe('the chase', () => {
  it('cracks a holder who would drop and marks who would rise', () => {
    const next: Medals = new Map([
      ['d', { medal: 1, defending: false }],
      ['a', { medal: 2, defending: false }],
      ['b', { medal: 3, defending: false }],
    ]);
    const c = chaseOf(held, next, ['a', 'd', 'c']);
    expect([...c.slipping]).toEqual(['a', 'c']);
    expect([...c.onTrack]).toEqual([['d', 1]]);
  });

  it('is quiet while medals are only defending', () => {
    const d: Medals = new Map([['x', { medal: 1, defending: true }]]);
    expect(chaseOf(d, new Map(), ['x'])).toEqual({ slipping: new Set(), onTrack: new Map() });
  });
});

describe('changes at the end of a game', () => {
  const after: Medals = new Map([
    ['d', { medal: 1, defending: false }],
    ['a', { medal: 2, defending: false }],
    ['b', { medal: 3, defending: false }],
  ]);

  it('lists every medal that moved, gold first, and names the new Badshah', () => {
    const ch = medalChanges(held, after);
    expect(ch.map((c) => c.playerId)).toEqual(['a', 'd', 'b', 'c']);
    expect(newBadshah(ch)).toEqual({ playerId: 'd', from: null, to: 1 });
  });

  it('sees nothing when nothing moved', () => {
    expect(medalChanges(held, held)).toEqual([]);
    expect(newBadshah([])).toBeNull();
  });

  it('calls a Badshah who kept gold and beat every medallist at the table a defence', () => {
    expect(
      defended(
        held,
        held,
        new Map([
          ['a', 1],
          ['b', 2],
          ['z', 3],
        ]),
      ),
    ).toBe('a');
    expect(
      defended(
        held,
        held,
        new Map([
          ['a', 2],
          ['b', 1],
        ]),
      ),
    ).toBeNull();
    // No other medallist sat: nothing to defend against.
    expect(
      defended(
        held,
        held,
        new Map([
          ['a', 1],
          ['z', 2],
        ]),
      ),
    ).toBeNull();
    expect(
      defended(
        held,
        after,
        new Map([
          ['a', 1],
          ['b', 2],
        ]),
      ),
    ).toBeNull();
  });
});
