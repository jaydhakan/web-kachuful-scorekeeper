import type { KtGame } from './domain/types';
import {
  allAchievements,
  KT_ACHIEVEMENTS,
  KT_LADDERS,
  ktFacts,
  ladderCounts,
  type KtFacts,
} from './domain/achievements';
import { dailyAwards, playedMonths, season, SEASON_MIN_GAMES } from './domain/awards';
import type { GameProgression } from '@/progression/registry';
import type { Award } from '@/progression/types';
import { pct } from '@/components/ui/Stats';
import { fmt } from '@/lib/format';
import { achievements, ladders, progressionText } from './strings/achievements';

const RATES = new Set([
  'day_sharp',
  'season_sharpest',
  'season_champion',
  'season_runner_up',
  'season_third',
]);

/** An award's value as people read it: made and win rates as percentages, the rest as numbers. */
export const awardValue = (a: Award): string => (RATES.has(a.code) ? pct(a.value) : fmt(a.value));

// The pages hand the same games array to every call; the facts are worked out once per array.
const cache = new WeakMap<readonly KtGame[], KtFacts>();
export const factsOf = (games: readonly KtGame[]): KtFacts => {
  let f = cache.get(games);
  if (!f) cache.set(games, (f = ktFacts(games)));
  return f;
};

/** Kaali Teeri on the shared kit (plan §4). Signed out, this device's games are the facts. */
export const progression: GameProgression<readonly KtGame[]> = {
  id: 'kaali-teeri',
  catalogue: KT_ACHIEVEMENTS,
  ladders: KT_LADDERS,
  strings: { achievements, ladders, ...progressionText },
  standings: 'winRate',
  seasonMin: SEASON_MIN_GAMES,
  awardValue,
  device: {
    earned: (games) => allAchievements(factsOf(games)),
    ladderCounts: (games, id) => ladderCounts(factsOf(games), id),
    daily: (games, day) => dailyAwards(factsOf(games), day),
    season: (games, month) => season(factsOf(games), month),
    months: (games) => playedMonths(factsOf(games)),
  },
};
