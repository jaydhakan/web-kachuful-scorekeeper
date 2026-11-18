import { cardsOf } from './cards';
import { levelUps, reelOrder } from './reel';
import { nearestLevel, nextLevel } from './ladders';
import type { AchievementDef, Earned, Ladder } from './types';

const games: Ladder = { id: 'games', codes: ['games_10', 'games_50'], steps: [10, 50] };
const cold: Ladder = { id: 'cold', codes: ['cold_3', 'cold_5'], steps: [3, 5], goal: false };

const won = (code: string, playerId: string, earnedAt: number, gameId = 'g'): Earned => ({
  code,
  playerId,
  gameId,
  roundIndex: null,
  period: null,
  earnedAt,
  data: {},
});

describe('levels', () => {
  it('the next level is the first step not yet reached', () => {
    expect(nextLevel(games, 9)).toMatchObject({ code: 'games_10', step: 10, count: 9 });
    expect(nextLevel(games, 10)).toMatchObject({ code: 'games_50' });
    expect(nextLevel(games, 50)).toBeNull();
  });

  it('the nearest is the closest at least half way, never one that is not a goal', () => {
    const wins: Ladder = { id: 'wins', codes: ['w1', 'w2'], steps: [2, 4] };
    expect(nearestLevel([games, cold, wins], { games: 7, cold: 4, wins: 3 })).toMatchObject({
      code: 'w2',
    });
    expect(nearestLevel([games, cold], { games: 8, cold: 4 })).toMatchObject({ code: 'games_10' });
    expect(nearestLevel([games, cold], { games: 4, cold: 4 })).toBeNull();
    expect(nearestLevel([games], {})).toBeNull();
  });
});

describe('cards', () => {
  it('show a ladder once, where its first level sits', () => {
    const cat: AchievementDef[] = [
      { code: 'games_10', emoji: '🎲', group: 'career' },
      { code: 'solo', emoji: '🐺', group: 'career' },
      { code: 'games_50', emoji: '🎲', group: 'career' },
      { code: 'moment', emoji: '✨', group: 'moment' },
    ];
    const cards = cardsOf(cat, [games], 'career');
    expect(cards.map((c) => c.l?.id ?? c.x?.code)).toEqual(['games', 'solo']);
  });
});

describe("a game's reel", () => {
  const cat = new Map<string, AchievementDef>(
    [
      { code: 'big', emoji: '', group: 'moment', big: true },
      { code: 'small', emoji: '', group: 'moment' },
      { code: 'win', emoji: '', group: 'game' },
    ].map((x) => [x.code, x as AchievementDef]),
  );

  it('puts big ones first, then the game finish, then the small moments, one per player and code', () => {
    const list = [
      won('small', 'a', 1),
      won('small', 'a', 2),
      won('win', 'a', 9),
      won('big', 'b', 5),
      won('win', 'b', 9, 'other'),
    ];
    expect(reelOrder(cat, list, 'g').map((e) => e.code + e.playerId)).toEqual([
      'bigb',
      'wina',
      'smalla',
    ]);
  });

  it('among cards of one rank, one the whole table earned goes last, so it never crowds out a winner', () => {
    const cat = new Map<string, AchievementDef>(
      [
        { code: 'winner', emoji: '', group: 'game' as const },
        { code: 'night_owl', emoji: '', group: 'game' as const },
        { code: 'first_win', emoji: '', group: 'career' as const },
      ].map((d) => [d.code, d]),
    );
    // Everything earned at the game's end, the night owls (everyone) before the second winner.
    const end = 100;
    const list = [
      won('winner', 'a', end),
      ...['a', 'b', 'c', 'd', 'e'].map((p) => won('night_owl', p, end)),
      won('winner', 'b', end),
      won('first_win', 'b', end),
    ];
    const order = reelOrder(cat, list, 'g').map((e) => e.code + e.playerId);
    expect(order.slice(0, 3)).toEqual(['winnera', 'winnerb', 'first_winb']);
    expect(order.slice(3).every((c) => c.startsWith('night_owl'))).toBe(true);
  });
});

describe('level ups', () => {
  it('are the ladders that gained a level in this game, with what was held before', () => {
    const earned = [won('games_10', 'a', 5, 'old'), won('games_50', 'a', 20, 'g')];
    expect(levelUps([games], earned, ['a', 'b'], { id: 'g', startedAt: 10 })).toEqual([
      { playerId: 'a', ladder: games, before: [true, false], after: [true, true] },
    ]);
    expect(levelUps([games], earned, ['a'], { id: 'other', startedAt: 10 })).toEqual([]);
  });
});
