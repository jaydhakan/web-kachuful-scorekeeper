import { clueFormatOk, norm } from './clue';
import { GRID, MIN_TEAM } from './rules';
import type { IshaaraRules, Seated } from './types';

export type CreateProblem =
  'players' | 'teams' | 'clue-givers' | 'words' | 'duplicate-words' | 'rules';

export const MAX_WORD_LEN = 16;
export const MAX_PLAYERS = 20;

/** A word on the board: one or two words of letters (custom words may hold a space), at most 16 characters. */
export function boardWordOk(w: unknown): w is string {
  if (typeof w !== 'string') return false;
  const t = norm(w);
  if (!t || [...t].length > MAX_WORD_LEN) return false;
  return t.split(' ').every((p) => clueFormatOk(p));
}

function rulesOk(r: IshaaraRules | undefined): boolean {
  if (!r || typeof r !== 'object') return false;
  if (![null, 60, 120, 180].includes(r.timerSec)) return false;
  if (r.clueEntry !== 'typed' && r.clueEntry !== 'spoken') return false;
  if (r.bestOf !== 1 && r.bestOf !== 3) return false;
  return (
    Array.isArray(r.packs) &&
    r.packs.every((p) => typeof p === 'string' && p.length <= 40) &&
    r.packs.length <= 10
  );
}

/** What's wrong with a new game's seats, words and rules, or null when the server may create it. */
export function validateNew(
  players: Seated[],
  words: string[],
  rules: IshaaraRules,
): CreateProblem | null {
  if (!Array.isArray(players) || players.length < MIN_TEAM * 2 || players.length > MAX_PLAYERS)
    return 'players';
  const ids = new Set(players.map((p) => p.playerId));
  if (players.some((p) => !p.playerId) || ids.size !== players.length) return 'players';
  if (players.some((p) => p.role !== 'clue-giver' && p.role !== 'guesser')) return 'players';
  if (players.some((p) => p.team !== 'sun' && p.team !== 'moon')) return 'teams';
  const teams = (['sun', 'moon'] as const).map((t) => players.filter((p) => p.team === t));
  if (teams.some((seats) => seats.length < MIN_TEAM)) return 'teams';
  if (teams.some((seats) => seats.filter((p) => p.role === 'clue-giver').length !== 1))
    return 'clue-givers';
  if (!Array.isArray(words) || words.length !== GRID || !words.every(boardWordOk)) return 'words';
  if (new Set(words.map(norm)).size !== GRID) return 'duplicate-words';
  if (!rulesOk(rules)) return 'rules';
  return null;
}
