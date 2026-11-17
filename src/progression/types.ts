import type { GameId } from '../platform/route';

export type { GameId };

/** `moment` is a round in Kachuful, a hand in Spades and Kaali Teeri, a turn in Ishaara. */
export type AchievementGroup = 'moment' | 'game' | 'career' | 'daily' | 'season';

export const GROUPS: AchievementGroup[] = ['moment', 'game', 'career', 'daily', 'season'];

export interface AchievementDef {
  code: string;
  emoji: string;
  group: AchievementGroup;
  /** Worth the full-screen burst when earned live. */
  big?: boolean;
  /** Funny, never mean: no burst, and a small 🙃 tag. */
  shame?: boolean;
}

/** One earned achievement (the contract's Achievement, without the server's row id). */
export interface Earned {
  code: string;
  playerId: string;
  gameId: string | null;
  roundIndex: number | null;
  period: string | null;
  earnedAt: number;
  data: Record<string, unknown>;
}

/** Earned at most once per player, code, game, round and period. */
export const earnedKey = (e: Earned) =>
  [e.playerId, e.code, e.gameId ?? '', e.roundIndex ?? '', e.period ?? ''].join('|');

/** Achievements that are levels of one count, shown as one card; `steps[i]` is the count `codes[i]` needs. */
export interface Ladder<Id extends string = string> {
  id: Id;
  codes: string[];
  steps: number[];
  /** False for a count nobody should chase (Kachuful's cold streak): never offered as the next goal. */
  goal?: boolean;
}

/** One daily or season award. */
export interface Award {
  code: string;
  playerId: string;
  value: number;
  gameId?: string;
  roundIndex?: number;
}

/** A row of a season's standings: what the podium and champions need, whatever the game ranks on. */
export interface StandingRow {
  playerId: string;
  rank: number | null;
  qualified: boolean;
  value: number;
  games: number;
}

/** Every game but Kachuful ranks a month on win rate (`value`, 0–1) with a minimum of games. */
export interface WinRateRow extends StandingRow {
  wins: number;
}

export interface SeasonResult<R extends StandingRow = StandingRow> {
  season: string;
  standings: R[];
  awards: Award[];
}

/**
 * One player's finished game, as each game builds it from its own data for the shared rules. Give every player of a
 * game a fact: crew counts the others from them.
 */
export interface PlayerGameFact {
  gameId: string;
  playerId: string;
  endedAt: number;
  /** Competition rank in the game (1 = first, ties share). */
  place: number;
  /** A draw is not a win. */
  won: boolean;
}
