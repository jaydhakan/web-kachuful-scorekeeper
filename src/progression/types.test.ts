import { retire, shownCatalogue, type AchievementDef } from './types';
import { ACHIEVEMENTS } from '@/games/kachuful/domain';

const defs: AchievementDef[] = [
  { code: 'a', emoji: 'A', group: 'game' },
  { code: 'b', emoji: 'B', group: 'season' },
];

describe('retired achievements', () => {
  it('marks only the codes given', () => {
    expect(retire(defs, ['b']).map((d) => d.retired ?? false)).toEqual([false, true]);
  });

  it('leaves a retired code out of the catalogue unless it was earned', () => {
    const cat = retire(defs, ['b']);
    expect(shownCatalogue(cat, new Set()).map((d) => d.code)).toEqual(['a']);
    expect(shownCatalogue(cat, new Set(['b'])).map((d) => d.code)).toEqual(['a', 'b']);
  });

  it("retires Kachuful's Sharpest of the season, and nothing else", () => {
    expect(ACHIEVEMENTS.filter((d) => d.retired).map((d) => d.code)).toEqual(['season_sharpest']);
  });
});
