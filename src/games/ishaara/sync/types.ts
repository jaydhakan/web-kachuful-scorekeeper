import type {
  Action,
  CreateProblem,
  EndedBy,
  Identity,
  InvalidReason,
  IshaaraHeadToHead,
  IshaaraPublic,
  IshaaraRules,
  IshaaraSort,
  IshaaraTally,
  Role,
  Seated,
  Team,
} from '../domain';
import type { PlayerSummary } from '@/sync/types';

/** The /api/ishaara/* shapes (backend-requests.md §3–§5). Times are epoch ms. */

/** `team` is the team this account gives clues for, if any. */
export interface IshaaraMe {
  host: boolean;
  team: Team | null;
}

/** Every game read and write answers with this; `serverNow` lets the device work out its clock offset. */
export interface IshaaraGameOut {
  game: IshaaraPublic;
  me: IshaaraMe;
  serverNow: number;
}

export interface CreateIshaara {
  id: string;
  /** Every seat with its registry `playerId`. */
  players: Seated[];
  words: string[];
  rules: IshaaraRules;
}

/** An action as sent: the domain's Action plus a fresh `actionId` (retries never act twice) and the rev seen. */
export type IshaaraActionBody = Action & { actionId: string; rev: number };

/** `GET /games/{id}/key`, for that game's two clue-giver accounts only. */
export interface IshaaraKeyOut {
  key: Identity[];
  team: Team;
}

export interface RematchBody {
  id: string;
  words: string[];
  clueGivers?: Partial<Record<Team, string>>;
}

export interface IshaaraSummaryPlayer {
  playerId: string;
  name: string;
  emoji: string;
  color: string;
  team: Team;
  role: Role;
}

/** A game in lists, from the server's summary: never the key, never which card is which. */
export interface IshaaraSummaryOut {
  id: string;
  createdAt: number;
  updatedAt: number;
  finishedAt: number | null;
  status: IshaaraPublic['status'];
  turn: Team;
  starting: Team;
  winner: Team | null;
  endedBy: EndedBy | null;
  match: IshaaraPublic['match'];
  wordsLeft: Record<Team, number>;
  revealed: number;
  host: { name: string };
  players: IshaaraSummaryPlayer[];
  myTeam: Team | null;
}

export interface IshaaraListQuery {
  role?: 'clue-giver';
  status?: 'active' | 'finished';
  /** Admin: any player's games. */
  involving?: string;
  cursor?: string | null;
  limit?: number;
}

export type IshaaraPeriod = 'today' | 'week' | 'season' | 'all';

export interface IshaaraLeaderboardRow extends Omit<IshaaraTally, 'playerId'> {
  /** Null when unranked (win % under MIN_GAMES games). */
  rank: number | null;
  player: PlayerSummary;
  value: number;
}

export interface IshaaraLeaderboardOut {
  period: IshaaraPeriod;
  sort: IshaaraSort;
  rows: IshaaraLeaderboardRow[];
  generatedAt: number;
}

export type IshaaraPlayerStatsOut = Omit<IshaaraTally, 'playerId'>;

export interface IshaaraVsOut extends IshaaraHeadToHead {
  a: PlayerSummary;
  b: PlayerSummary;
}

/** Error codes the Ishaara routes add: `invalid_action` carries a reason, `invalid_game` a create problem. */
export type IshaaraErrorReason =
  InvalidReason | 'not-finished' | CreateProblem | 'clue-giver-account';
