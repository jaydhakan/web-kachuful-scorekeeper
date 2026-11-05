import { describe, expect, it } from 'vitest';
import { cardsFor, cycleLen } from './cards';
import { kitGame } from './__fixtures__/kit';
import { newRound, totalRounds } from './rounds';
import { validate } from './validate';

const seq = (max: number, order?: 'up' | 'down') =>
  Array.from({ length: cycleLen(max) }, (_, i) => cardsFor(i, max, order));

describe('round order', () => {
  it('up first (the default) deals 3 → max → 3, as it always has', () => {
    expect(seq(8)).toEqual([3, 4, 5, 6, 7, 8, 8, 7, 6, 5, 4, 3]);
    expect(seq(8, 'up')).toEqual(seq(8));
  });

  it('down first deals max → 3 → max', () => {
    expect(seq(8, 'down')).toEqual([8, 7, 6, 5, 4, 3, 3, 4, 5, 6, 7, 8]);
    expect(seq(6, 'down')).toEqual([6, 5, 4, 3, 3, 4, 5, 6]);
  });

  it('a second cycle repeats the first, in either order', () => {
    expect(cardsFor(12, 8, 'down')).toBe(8);
    expect(cardsFor(17, 8, 'down')).toBe(3);
    expect(cardsFor(12, 8)).toBe(3);
  });

  it("a game's rounds follow its order; the number of rounds doesn't change", () => {
    const g = { ...kitGame({ id: 'o', players: ['a', 'b', 'c', 'd'], start: 0, rounds: [] }) };
    const down = { ...g, order: 'down' as const, lengthMode: '1cycle' as const };
    expect(newRound(down, 0).cards).toBe(down.maxCards);
    expect(newRound({ ...down, order: 'up' }, 0).cards).toBe(3);
    expect(totalRounds(down)).toBe(cycleLen(down.maxCards));
  });

  it('validate accepts a down-first game and rejects one whose cards went up', () => {
    const g = kitGame({
      id: 'vd',
      players: ['a', 'b', 'c'],
      start: 0,
      order: 'down',
      rounds: [{ made: [true, true, false] }, { made: [false, true, true] }],
      finished: true,
    });
    expect(g.rounds[0].cards).toBe(g.maxCards);
    expect(validate(g, 864e5)).toEqual({ ok: true });
    expect(validate({ ...g, order: 'up' }, 864e5)).toMatchObject({ ok: false });
  });
});
