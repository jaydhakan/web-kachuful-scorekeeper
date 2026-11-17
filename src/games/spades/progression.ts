import type { SpGame } from './domain/types';
import type { GameProgression } from '@/progression/registry';
import { achievements, ladders, progressionText } from './strings/achievements';

/**
 * Spades on the shared kit (plan §3): one catalogue for the scorekeeper and online tables. Signed out, the
 * scorekeeper's games on this device are the facts; online tables are the server's only. Empty until its rules land.
 */
export const progression: GameProgression<readonly SpGame[]> = {
  id: 'spades',
  catalogue: [],
  ladders: [],
  strings: { achievements, ladders, ...progressionText },
  standings: 'winRate',
  seasonMin: 10,
  device: {
    earned: () => [],
    ladderCounts: () => ({}),
    daily: () => [],
    season: (_games, month) => ({ season: month, standings: [], awards: [] }),
    months: () => [],
  },
};
