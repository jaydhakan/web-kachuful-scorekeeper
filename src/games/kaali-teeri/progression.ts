import type { KtGame } from './domain/types';
import type { GameProgression } from '@/progression/registry';
import { achievements, ladders, progressionText } from './strings/achievements';

/**
 * Kaali Teeri on the shared kit (plan §4). Signed out, this device's games are the facts. Empty until its rules
 * land.
 */
export const progression: GameProgression<readonly KtGame[]> = {
  id: 'kaali-teeri',
  catalogue: [],
  ladders: [],
  strings: { achievements, ladders, ...progressionText },
  standings: 'winRate',
  seasonMin: 8,
  device: {
    earned: () => [],
    ladderCounts: () => ({}),
    daily: () => [],
    season: (_games, month) => ({ season: month, standings: [], awards: [] }),
    months: () => [],
  },
};
