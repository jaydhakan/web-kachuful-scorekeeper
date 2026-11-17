import type { GameProgression } from '@/progression/registry';
import { achievements, ladders, progressionText } from './strings/achievements';

/**
 * Ishaara on the shared kit (plan §5). The server works everything out and the app only shows it, so there is no
 * `device`: signed out there is nothing to show. Empty until its rules land.
 */
export const progression: GameProgression = {
  id: 'ishaara',
  catalogue: [],
  ladders: [],
  strings: { achievements, ladders, ...progressionText },
  standings: 'winRate',
  seasonMin: 8,
};
