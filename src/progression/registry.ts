import type {
  AchievementDef,
  AchievementGroup,
  Award,
  Earned,
  GameId,
  Ladder,
  SeasonResult,
} from './types';

export interface AchievementText {
  name: string;
  how: string;
}

/** A game's own words for its catalogue (they live in its strings/ folder). */
export interface ProgressionStrings {
  /** Every code in the catalogue, and nothing else. */
  achievements: Record<string, AchievementText>;
  /** Each ladder's card title and what its count counts, by ladder id. */
  ladders: Record<string, { name: string; count: string }>;
  /** Section titles: `moment` reads "Round moments", "Hand moments" or "Turn moments". */
  groups: Record<AchievementGroup, string>;
  /** Under "No games that day": what makes awards appear. */
  dayEmpty: string;
  /** A month's standings with nobody in them. */
  seasonEmpty: string;
}

/**
 * How signed-out play works everything out on the phone, from `F`: whatever the game's own pages already gather from
 * this device's games (Kachuful's Facts, say). Days and months are the device's.
 */
export interface DeviceProgression<F> {
  /** Everything earned, oldest first. */
  earned(f: F): Earned[];
  ladderCounts(f: F, playerId: string): Record<string, number>;
  /** A 'YYYY-MM-DD' day's awards. */
  daily(f: F, day: string): Award[];
  /** A 'YYYY-MM' month's standings and awards. */
  season(f: F, month: string): SeasonResult;
  /** Months with play, newest first. */
  months(f: F): string[];
}

/** One game's achievements and awards, as the shared pages show them. Each game implements it in its own folder. */
export interface GameProgression<F = unknown> {
  id: GameId;
  /** Every achievement, in the order the page shows them; group by group. */
  catalogue: AchievementDef[];
  ladders: Ladder[];
  strings: ProgressionStrings;
  /** Kachuful ranks a month on points per round; every other game on win rate. */
  standings: 'points' | 'winRate';
  /** Kachuful: more than this many rounds; the others: at least this many games. */
  seasonMin: number;
  /** An award's value as people read it; left out, win-rate places read as a percentage, the rest as numbers. */
  awardValue?(a: Award): string;
  /** Left out for a game played only online (Ishaara, online Spades): signed out it shows nothing. */
  device?: DeviceProgression<F>;
}

/** Each game's progression, a chunk of its own: never part of a first load. */
const LOAD: Record<GameId, () => Promise<GameProgression>> = {
  kachuful: () => import('../games/kachuful/progression').then((m) => m.progression),
  spades: () => import('../games/spades/progression').then((m) => m.progression),
  'kaali-teeri': () => import('../games/kaali-teeri/progression').then((m) => m.progression),
  ishaara: () => import('../games/ishaara/progression').then((m) => m.progression),
};

const loaded = new Map<GameId, GameProgression>();

export async function loadProgression(id: GameId): Promise<GameProgression> {
  const hit = loaded.get(id);
  if (hit) return hit;
  const p = await LOAD[id]();
  loaded.set(id, p);
  return p;
}

/** A game's progression if it has loaded already. */
export const peekProgression = (id: GameId): GameProgression | undefined => loaded.get(id);
