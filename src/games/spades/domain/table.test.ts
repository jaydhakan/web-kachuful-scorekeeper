import { describe, expect, it } from 'vitest';
import { kitGame } from './__fixtures__/kit';
import { gameResult, gameTotals, newHand, nilRange, tableHand, tricksOk } from './table';

describe('table-mode hands', () => {
  it('a new hand is the next index with its dealer, nothing entered', () => {
    const g = kitGame([{ bids: [3, 3, 3, 3], teamA: 6 }], { first: 3 });
    expect(newHand(g)).toMatchObject({
      index: 1,
      dealer: 0,
      bids: [null, null, null, null],
      teamTricks: null,
      phase: 'bidding',
    });
  });

  it('builds a finished hand from bids, team a’s tricks and the Nil bidders’ tricks', () => {
    const h = tableHand({
      index: 2,
      dealer: 1,
      bids: [0, 4, 5, 3],
      blind: [true, true, false, false],
      teamA: 6,
      nilTricks: [0, 2, null, null],
      doneAt: 5,
    });
    expect(h).toEqual({
      index: 2,
      dealer: 1,
      bids: [0, 4, 5, 3],
      blind: [true, false, false, false],
      teamTricks: [6, 7],
      nilTricks: [0, null, null, null],
      phase: 'done',
      doneAt: 5,
    });
  });

  it('Nil tricks fit inside the team’s; two Nil partners took all of them', () => {
    const one = { bids: [0, 3, 4, 3] };
    expect(tricksOk(one, [5, 8], [2, null, null, null])).toBe(true);
    expect(tricksOk(one, [5, 8], [6, null, null, null])).toBe(false);
    expect(tricksOk(one, [5, 8], [null, null, null, null])).toBe(false);
    expect(tricksOk(one, [5, 8], [0, 1, null, null])).toBe(false);
    expect(tricksOk(one, [5, 7], [0, null, null, null])).toBe(false);
    const both = { bids: [0, 3, 0, 3] };
    expect(tricksOk(both, [2, 11], [1, null, 1, null])).toBe(true);
    expect(tricksOk(both, [2, 11], [1, null, 0, null])).toBe(false);
  });

  it('the range a Nil bidder can have taken', () => {
    expect(nilRange({ bids: [0, 3, 4, 3] }, 0, 5, [null, null, null, null])).toEqual({
      min: 0,
      max: 5,
    });
    expect(nilRange({ bids: [3, 0, 4, 3] }, 1, 5, [null, null, null, null])).toEqual({
      min: 0,
      max: 8,
    });
    expect(nilRange({ bids: [0, 3, 0, 3] }, 2, 3, [1, null, null, null])).toEqual({
      min: 2,
      max: 2,
    });
  });

  it('totals and the result read only finished hands', () => {
    const g = kitGame([
      { bids: [4, 3, 4, 3], teamA: 8 },
      { bids: [4, 3, 4, 3], teamA: 8 },
      { bids: [4, 3, 4, 3], teamA: 8 },
      { bids: [4, null, null, null], phase: 'bidding' },
    ]);
    expect(gameTotals(g).a.score).toBe(240);
    expect(gameTotals(g).b.score).toBe(-180);
    expect(gameResult(g)).toEqual({ winner: 'a', endedBy: 'target' });
    expect(gameResult({ ...g, hands: g.hands.slice(0, 2) })).toBeNull();
  });
});
