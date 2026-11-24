import {
  ACHIEVEMENTS,
  deviceAchievements,
  dailyAwards,
  LADDERS,
  ladderCounts,
  playedMonths,
  season,
  SEASON_MIN_ROUNDS,
  seasonMetric,
  type Award,
  type Facts,
} from '@/games/kachuful/domain';
import type { GameProgression } from '@/progression/registry';
import type { SeasonResult } from '@/progression/types';
import { achievements } from '@/games/kachuful/strings/achievements';
import { fmt, sgnN } from '@/lib/format';
import { pct } from '@/components/ui/Stats';
import { t } from '@/strings';

const PLACES = new Set(['season_champion', 'season_runner_up', 'season_third']);

/** An award's value as people read it; a place reads in its season's metric (`seasonMetric`). */
export function awardValue(a: Award, s?: SeasonResult): string {
  if (a.code === 'day_sharp' || a.code === 'season_sharpest') return pct(a.value);
  if (a.code === 'day_bang' || a.code === 'day_ouch' || a.code === 'day_star') return sgnN(a.value);
  if (PLACES.has(a.code))
    return s && seasonMetric(s.standings) === 'avgPerRound'
      ? String(Math.round(a.value))
      : pct(a.value);
  return fmt(a.value);
}

/** Kachuful on the shared kit: its rules are its own domain's, unchanged. */
export const progression: GameProgression<Facts> = {
  id: 'kachuful',
  catalogue: ACHIEVEMENTS,
  ladders: LADDERS,
  strings: {
    achievements,
    ladders: t.hub.ach.ladders,
    groups: t.hub.ach.groups,
    dayEmpty: t.hub.awards.noneBody,
    seasonEmpty: t.hub.awards.noSeason,
  },
  standings: 'points',
  seasonMin: SEASON_MIN_ROUNDS,
  awardValue,
  device: {
    earned: (f) => deviceAchievements(f),
    ladderCounts: (f, id) => ladderCounts(f, id),
    daily: (f, day) => dailyAwards(f, day),
    season: (f, month) => season(f, month),
    months: (f) => playedMonths(f),
  },
};
