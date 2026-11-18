import type { Seat, TrickRec } from '@/games/spades/domain/types';
import { bostonOf, lastTrickDecides } from './present';

/** Tricks won by these seats, in order (the cards don't matter here). */
const won = (...w: Seat[]): TrickRec[] => w.map((winner) => ({ plays: [], winner }));
const twelve = (counts: [number, number, number, number]) =>
  won(...counts.flatMap((n, s) => Array<Seat>(n).fill(s as Seat)));

describe('Boston', () => {
  it('is the team that took all 13 tricks', () => {
    expect(bostonOf({ teamTricks: [13, 0] })).toBe('a');
    expect(bostonOf({ teamTricks: [0, 13] })).toBe('b');
    expect(bostonOf({ teamTricks: [12, 1] })).toBeNull();
    expect(bostonOf({ teamTricks: null })).toBeNull();
    expect(bostonOf(undefined)).toBeNull();
  });
});

describe('the last trick decides it', () => {
  it('when a team is one short of its contract with one trick to play', () => {
    // Team a (seats 0, 2) bid 4 + 3 and has 6; team b bid 3 + 3 and has 6.
    const t = { bids: [4, 3, 3, 3], tricks: twelve([3, 3, 3, 3]) };
    expect(lastTrickDecides(t, 12)).toBe(true);
  });

  it('when a Nil is still alive', () => {
    const t = { bids: [0, 2, 5, 2], tricks: twelve([0, 3, 7, 2]) };
    expect(lastTrickDecides(t, 12)).toBe(true);
  });

  it('not when every contract is settled and no Nil is alive, nor before trick 13', () => {
    const t = { bids: [3, 3, 3, 3], tricks: twelve([3, 3, 3, 3]) };
    expect(lastTrickDecides(t, 12)).toBe(false);
    // A Nil bidder's tricks don't help the partner: seat 2 bid 7 and has 6, so it is one short.
    const nil = { bids: [0, 3, 7, 2], tricks: twelve([1, 3, 6, 2]) };
    expect(lastTrickDecides(nil, 12)).toBe(true);
    expect(lastTrickDecides({ bids: [4, 3, 3, 3], tricks: twelve([3, 3, 3, 3]) }, 11)).toBe(false);
  });
});
