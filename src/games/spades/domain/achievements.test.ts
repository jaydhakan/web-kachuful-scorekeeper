import { describe, expect, it } from 'vitest';
import { kitGame, T0, WHO } from './__fixtures__/kit';
import { spAchievements, type SpAchievement } from './achievements';
import type { SpGame } from './types';

const [RIYA, ARJUN] = WHO.map((w) => w.playerId);
type Entry = Parameters<typeof kitGame>[0][number];

const game = (entries: Entry[], extra: Partial<SpGame> = {}, n = 1): SpGame =>
  kitGame(entries, {
    id: `g${n}`,
    syncId: `s${n}`,
    status: 'finished',
    result: { winner: 'a', endedBy: 'end' },
    finishedAt: T0 + n,
    ...extra,
  });
const ids = (games: SpGame[], who: string): SpAchievement[] =>
  spAchievements(games, who).map((e) => e.id);

describe('Spades achievements', () => {
  it('a Nil made is Ice Cold, and setting the other team is Set Them', () => {
    const g = game([
      { bids: [3, 4, 3, 3], teamA: 7 },
      { bids: [0, 4, 4, 3], teamA: 5, nil: [0, null, null, null] },
    ]);
    expect(ids([g], RIYA)).toEqual(['iceCold', 'setThem']);
    expect(ids([g], ARJUN)).toEqual([]);
  });

  it('all 13 tricks is a Boston', () => {
    expect(ids([game([{ bids: [3, 3, 3, 3], teamA: 13 }])], RIYA)).toContain('boston');
  });

  it('a win with every hand made exactly is Exact; a mercy win is Mercy', () => {
    const g = game([{ bids: [3, 4, 3, 3], teamA: 6 }], {
      result: { winner: 'b', endedBy: 'mercy' },
    });
    expect(ids([g], ARJUN)).toEqual(['exact', 'mercy']);
    // The losers earn neither.
    expect(ids([g], RIYA)).toEqual([]);
  });

  it('winning from 150 behind is a Comeback', () => {
    const g = game([
      { bids: [5, 5, 5, 4], teamA: 0 },
      { bids: [4, 1, 4, 1], teamA: 13 },
    ]);
    expect(ids([g], RIYA)).toContain('comeback');
  });

  it('ten wins with one partner is Perfect Pair, counted once', () => {
    const wins = Array.from({ length: 10 }, (_, i) =>
      game([{ bids: [3, 4, 3, 3], teamA: 7 }], {}, i + 1),
    );
    const pp = spAchievements(wins, RIYA).find((e) => e.id === 'perfectPair');
    expect(pp).toMatchObject({ count: 1, at: T0 + 10 });
    expect(ids(wins.slice(1), RIYA)).not.toContain('perfectPair');
  });

  it('a cancelled game earns nothing', () => {
    const g = game([{ bids: [3, 3, 3, 3], teamA: 13 }], { status: 'cancelled', result: undefined });
    expect(ids([g], RIYA)).toEqual([]);
  });
});
