import type { AchievementText, ProgressionStrings } from '@/progression/registry';

/** Every Ishaara achievement's name and how it is earned, by code (the server uses the same names). */
export const achievements: Record<string, AchievementText> = {};

/** Each ladder's card title and what its count counts, by ladder id. */
export const ladders: ProgressionStrings['ladders'] = {};

/** The words around Ishaara's catalogue on the shared pages. */
export const progressionText: Omit<ProgressionStrings, 'achievements' | 'ladders'> = {
  groups: {
    moment: 'Turn moments',
    game: 'Game finish',
    career: 'Career',
    daily: 'Daily awards',
    season: 'Seasons',
  },
  dayEmpty: 'Awards appear once games are played.',
  seasonEmpty: 'No games this month yet',
};
