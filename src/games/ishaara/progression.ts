import type { GameProgression } from '@/progression/registry';
import type { Award } from '@/progression/types';
import { fmt } from '@/lib/format';
import { pct } from '@/components/ui/Stats';
import { CATALOGUE, LADDERS } from './domain/achievements';
import { achievements, ladders, perClue, progressionText } from './strings/achievements';

const PLACES = new Set(['season_champion', 'season_runner_up', 'season_third']);

/** "4:05" from a span in ms. */
const clock = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** An award's value as people read it: places as a win rate, the fastest win as a time, per-clue rates to one place. */
export function awardValue(a: Award): string {
  if (PLACES.has(a.code)) return pct(a.value);
  if (a.code === 'day_speed') return clock(a.value);
  if (a.code === 'day_giver' || a.code === 'season_giver') return perClue(a.value.toFixed(1));
  return fmt(a.value);
}

/**
 * Ishaara on the shared kit (plan §5). The server works everything out and the app only shows it, so there is no
 * `device`: signed out there is nothing to show.
 */
export const progression: GameProgression = {
  id: 'ishaara',
  catalogue: CATALOGUE,
  ladders: LADDERS,
  strings: { achievements, ladders, ...progressionText },
  standings: 'winRate',
  seasonMin: 8,
  awardValue,
};
