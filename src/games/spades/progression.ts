import { allAchievements, ladderCounts, SP_CATALOGUE, SP_LADDERS } from './domain/achievements';
import { dailyAwards, playedMonths, SEASON_MIN_GAMES, spSeason } from './domain/awards';
import type { SpGame } from './domain/types';
import type { GameProgression } from '@/progression/registry';
import type { Award } from '@/progression/types';
import { pct } from '@/components/ui/Stats';
import { fmt } from '@/lib/format';
import { achievements, ladders, progressionText } from './strings/achievements';

const RATES = new Set(['day_sharp', 'season_sharpest', 'season_pair']);
const PLACES = new Set(['season_champion', 'season_runner_up', 'season_third']);

/** An award's value as people read it: rates as percentages, the rest as counts. */
export const awardValue = (a: Award): string =>
  RATES.has(a.code) || PLACES.has(a.code) ? pct(a.value) : fmt(a.value);

/**
 * Spades on the shared kit (plan §3): one catalogue for the scorekeeper and online tables. Signed out, the
 * scorekeeper's games on this device are the facts (in the device's zone); online tables are the server's only.
 */
export const progression: GameProgression<readonly SpGame[]> = {
  id: 'spades',
  catalogue: SP_CATALOGUE,
  ladders: SP_LADDERS,
  strings: { achievements, ladders, ...progressionText },
  standings: 'winRate',
  seasonMin: SEASON_MIN_GAMES,
  awardValue,
  device: {
    earned: (games) => allAchievements(games),
    ladderCounts: (games, id) => ladderCounts(games, id),
    daily: (games, day) => dailyAwards(games, day),
    season: (games, month) => spSeason(games, month),
    months: (games) => playedMonths(games),
  },
};
