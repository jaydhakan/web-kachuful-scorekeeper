import type { AchievementText, ProgressionStrings } from '@/progression/registry';

/** Every Kaali Teeri achievement's name and how it is earned, by code (the server uses the same names). */
export const achievements: Record<string, AchievementText> = {};

/** Each ladder's card title and what its count counts, by ladder id. */
export const ladders: ProgressionStrings['ladders'] = {};

/** The words around Kaali Teeri's catalogue on the shared pages. */
export const progressionText: Omit<ProgressionStrings, 'achievements' | 'ladders'> = {
  groups: {
    moment: 'Hand moments',
    game: 'Game finish',
    career: 'Career',
    daily: 'Daily awards',
    season: 'Seasons',
  },
  dayEmpty: 'Awards appear once hands are played.',
  seasonEmpty: 'No games this month yet',
};
