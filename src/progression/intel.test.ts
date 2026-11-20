import { tableIntel } from './intel';
import type { KursiGame } from './kursi';

/** Game `k`, ended at `k`, finished in `order`. */
const g = (k: number, order: string[]): KursiGame => ({
  gameId: 'g' + k,
  endedAt: k,
  seats: order.map((playerId, seat) => ({ playerId, place: seat + 1, seat })),
});

describe('the table intel line', () => {
  it('names a rivalry one side has won most of their last games together', () => {
    const games = [
      ...Array.from({ length: 7 }, (_, k) => g(k, ['dev', 'asha', 'zoya'])),
      g(7, ['asha', 'dev', 'zoya']),
      g(8, ['asha', 'zoya', 'dev']),
    ];
    expect(tableIntel(games, ['asha', 'dev', 'kabir'])).toEqual({
      kind: 'rivalry',
      winner: 'dev',
      loser: 'asha',
      won: 7,
      of: 9,
    });
  });

  it('says nothing about a pair with too few games or an even record', () => {
    const few = Array.from({ length: 4 }, (_, k) => g(k, ['dev', 'asha', 'zoya']));
    expect(tableIntel(few, ['asha', 'dev'])).toBeNull();
    const even = Array.from({ length: 8 }, (_, k) =>
      g(k, k % 2 ? ['dev', 'asha', 'zoya'] : ['asha', 'dev', 'zoya']),
    );
    expect(tableIntel(even, ['asha', 'dev'])).toBeNull();
  });

  it("puts a milestone first: this game is the first seated player's 50th", () => {
    const games = Array.from({ length: 49 }, (_, k) => g(k, ['riya', 'dev', 'asha']));
    expect(tableIntel(games, ['dev', 'riya'])).toEqual({
      kind: 'milestone',
      player: 'dev',
      nth: 50,
    });
  });

  it('puts a bounty first when a crown holder sits at a table of three or more', () => {
    const games = Array.from({ length: 49 }, (_, k) => g(k, ['riya', 'dev', 'asha']));
    expect(tableIntel(games, ['dev', 'riya', 'asha'], ['riya', 'zoya'])).toEqual({
      kind: 'bounty',
      holders: ['riya'],
    });
    // Two at the table, or no holder seated: the milestone as before.
    expect(tableIntel(games, ['dev', 'riya'], ['riya'])?.kind).toBe('milestone');
    expect(tableIntel(games, ['dev', 'riya', 'asha'], ['zoya'])?.kind).toBe('milestone');
  });
});
