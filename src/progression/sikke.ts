import type { AchievementDef, Ladder } from './types';

/**
 * Sikke, the app's coins (REWARDS-PLAN §9). The server decides every entry in the game write's transaction; these
 * are the rules it mirrors (contract/fixtures/sikke-rules.json) and the numbers the app shows.
 */
export const SIKKE = {
  finish: 30,
  /** On top of `finish`, for a game every player played on their own phone (Ishaara, online Spades). */
  onlineBonus: 10,
  win: 25,
  moment: 5,
  game: 10,
  career: 25,
  /** A ladder's level N pays this × N instead of `career`. */
  ladderStep: 25,
  daily: 15,
  season: 100,
  /** The Taj: the month's champion. */
  champion: 300,
  /** Finishing above the Taj holder (the Badshah): once per challenger per holder per ISO week, at a table of 3+. */
  bounty: 40,
  /** Tonight's Sitara, paid when the night closes. */
  sitara: 30,
  /** The first game of a week pays this × the weeks in a row played, up to `streakMax`. */
  streakStep: 10,
  streakMax: 50,
  /** Finishes and wins pay for this many games of one kind a day; achievements always pay. */
  dailyGameCap: 8,
} as const;

/** What one achievement or award pays. Shame codes and a ladder nobody should chase pay nothing. */
export function achievementSikke(def: AchievementDef, ladders: readonly Ladder[]): number {
  if (def.shame) return 0;
  if (def.code === 'season_champion') return SIKKE.champion;
  if (def.group === 'daily') return SIKKE.daily;
  if (def.group === 'season') return SIKKE.season;
  const ladder = ladders.find((l) => l.codes.includes(def.code));
  if (ladder?.goal === false) return 0;
  if (ladder) return SIKKE.ladderStep * (ladder.codes.indexOf(def.code) + 1);
  return SIKKE[def.group] * (def.big ? 2 : 1);
}

/** Levels by lifetime Sikke earned; each `from` is where that level starts. Names are strings, by `n`. */
export const LEVELS = [
  { n: 1, from: 0 },
  { n: 2, from: 500 },
  { n: 3, from: 1500 },
  { n: 4, from: 4000 },
  { n: 5, from: 9000 },
  { n: 6, from: 18000 },
] as const;

export interface Level {
  n: number;
  from: number;
  /** Where the next level starts; null at the top. */
  next: number | null;
}

export function levelOf(lifetime: number): Level {
  let i = 0;
  while (i + 1 < LEVELS.length && lifetime >= LEVELS[i + 1]!.from) i++;
  return { n: LEVELS[i]!.n, from: LEVELS[i]!.from, next: LEVELS[i + 1]?.from ?? null };
}
