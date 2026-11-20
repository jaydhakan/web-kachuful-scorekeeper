import { kursiFrom, longestReign, stepKursi, type KursiGame } from './kursi';

/** A game where `order` finished in that order (first is 1st); `ties` share the place of the one before. */
const game = (
  id: string,
  at: number,
  order: string[],
  o: { ties?: string[]; teams?: boolean } = {},
) => {
  let place = 0;
  const seats = order.map((playerId, seat) => {
    if (!o.ties?.includes(playerId)) place = seat + 1;
    return { playerId, place, seat };
  });
  return { gameId: id, endedAt: at, seats, teams: o.teams } satisfies KursiGame;
};

describe('the Kursi', () => {
  it("goes to the first game's winner", () => {
    expect(stepKursi(null, game('g1', 1, ['a', 'b', 'c']))).toEqual({
      kursi: { holders: ['a'], since: 1, sinceGame: 'g1', defences: 0 },
      event: { kind: 'first', to: ['a'] },
    });
  });

  it('is taken by the best player who finished above the holder', () => {
    const k = { holders: ['c'], since: 1, sinceGame: 'g1', defences: 4 };
    // b is above c and ahead of d, who is also above; a is the game's winner and takes it.
    const r = stepKursi(k, game('g2', 2, ['a', 'b', 'c', 'd']));
    expect(r.event).toEqual({ kind: 'taken', from: ['c'], to: ['a'] });
    expect(r.kursi).toEqual({ holders: ['a'], since: 2, sinceGame: 'g2', defences: 0 });
  });

  it('goes to the earlier seat on a tie at the top', () => {
    const k = { holders: ['c'], since: 1, sinceGame: 'g1', defences: 0 };
    const r = stepKursi(k, game('g2', 2, ['b', 'a', 'c'], { ties: ['a'] }));
    expect(r.kursi?.holders).toEqual(['b']);
  });

  it('counts a defence when nobody finishes above the holder, a tie included', () => {
    const k = { holders: ['a'], since: 1, sinceGame: 'g1', defences: 2 };
    expect(stepKursi(k, game('g2', 2, ['a', 'b', 'c'])).event).toEqual({
      kind: 'defended',
      defences: 3,
    });
    expect(stepKursi(k, game('g3', 3, ['b', 'a', 'c'], { ties: ['a'] })).event).toEqual({
      kind: 'defended',
      defences: 3,
    });
  });

  it('stays put when the holder sat out, and with fewer than three at the table', () => {
    const k = { holders: ['a'], since: 1, sinceGame: 'g1', defences: 2 };
    expect(stepKursi(k, game('g2', 2, ['b', 'c', 'd']))).toEqual({
      kursi: k,
      event: { kind: 'kept' },
    });
    expect(stepKursi(k, game('g3', 3, ['b', 'a']))).toEqual({ kursi: k, event: { kind: 'kept' } });
    expect(stepKursi(null, game('g4', 4, ['b', 'a'])).kursi).toBeNull();
  });

  it('is shared by a winning side, and lost when the side is beaten', () => {
    const sides = game('g1', 1, ['a', 'b', 'c', 'd'], { ties: ['b', 'd'], teams: true });
    // a and b share 1st, c and d share 3rd.
    const won = stepKursi(null, sides);
    expect(won.kursi?.holders).toEqual(['a', 'b']);
    const lost = stepKursi(
      won.kursi,
      game('g2', 2, ['c', 'd', 'a', 'b'], { ties: ['d', 'b'], teams: true }),
    );
    expect(lost.event).toEqual({ kind: 'taken', from: ['a', 'b'], to: ['c', 'd'] });
  });
});

describe('the reigns', () => {
  const games = [
    game('g3', 30, ['b', 'a', 'c']),
    game('g1', 10, ['a', 'b', 'c']),
    game('g2', 20, ['a', 'c', 'b']),
    game('g4', 40, ['b', 'c', 'a']),
  ];

  it('plays the games oldest first and keeps every reign', () => {
    const { kursi, reigns } = kursiFrom(games);
    expect(kursi).toEqual({ holders: ['b'], since: 30, sinceGame: 'g3', defences: 1 });
    expect(reigns).toEqual([
      { holders: ['a'], since: 10, sinceGame: 'g1', defences: 1, until: 30 },
      { holders: ['b'], since: 30, sinceGame: 'g3', defences: 1, until: null },
    ]);
  });

  it('names the longest reign by defences, then by time held', () => {
    const { reigns } = kursiFrom(games);
    expect(longestReign(reigns, 100)?.holders).toEqual(['b']);
    expect(longestReign([], 100)).toBeNull();
  });

  it('is empty with no games', () => {
    expect(kursiFrom([])).toEqual({ kursi: null, reigns: [] });
  });
});
