import { achievementSikke, levelOf, SIKKE } from './sikke';
import type { AchievementDef, Ladder } from './types';

const ladders: Ladder[] = [
  { id: 'games', codes: ['games_10', 'games_50', 'games_100'], steps: [10, 50, 100] },
];
const def = (
  code: string,
  group: AchievementDef['group'],
  x: Partial<AchievementDef> = {},
): AchievementDef => ({
  code,
  emoji: '',
  group,
  ...x,
});

describe('achievementSikke', () => {
  it('pays by group, double for a big one', () => {
    expect(achievementSikke(def('a', 'moment'), ladders)).toBe(SIKKE.moment);
    expect(achievementSikke(def('a', 'moment', { big: true }), ladders)).toBe(2 * SIKKE.moment);
    expect(achievementSikke(def('a', 'game'), ladders)).toBe(SIKKE.game);
    expect(achievementSikke(def('a', 'career', { big: true }), ladders)).toBe(2 * SIKKE.career);
  });

  it('pays a ladder by its level', () => {
    expect(achievementSikke(def('games_10', 'career'), ladders)).toBe(SIKKE.ladderStep);
    expect(achievementSikke(def('games_100', 'career'), ladders)).toBe(3 * SIKKE.ladderStep);
    const cold: Ladder = { id: 'cold', codes: ['cold_3'], steps: [3], goal: false };
    expect(achievementSikke(def('cold_3', 'moment'), [cold])).toBe(0);
  });

  it('pays awards, the Taj most, and nothing for a shame code', () => {
    expect(achievementSikke(def('day_star', 'daily'), ladders)).toBe(SIKKE.daily);
    expect(achievementSikke(def('season_iron', 'season'), ladders)).toBe(SIKKE.season);
    expect(achievementSikke(def('season_champion', 'season', { big: true }), ladders)).toBe(
      SIKKE.champion,
    );
    expect(achievementSikke(def('cold_5', 'moment', { shame: true }), ladders)).toBe(0);
  });
});

describe('levelOf', () => {
  it('starts at 1 and stops at the top', () => {
    expect(levelOf(0)).toEqual({ n: 1, from: 0, next: 500 });
    expect(levelOf(499).n).toBe(1);
    expect(levelOf(500)).toEqual({ n: 2, from: 500, next: 1500 });
    expect(levelOf(10 ** 6)).toEqual({ n: 6, from: 18000, next: null });
  });
});
