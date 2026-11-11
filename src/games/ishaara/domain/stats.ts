import type { IshaaraPlayerRow, IshaaraPublic, Team } from './types';

interface TeamTally {
  wordsFound: number;
  wrongPicks: number;
  trapHit: boolean;
  clues: number;
  clueSum: number;
  finiteClues: number;
  penalties: number;
}

const blank = (): TeamTally => ({
  wordsFound: 0,
  wrongPicks: 0,
  trapHit: false,
  clues: 0,
  clueSum: 0,
  finiteClues: 0,
  penalties: 0,
});

/** Per team, from the log: undone guesses have already left it, so every guess counted stands. */
export function tally(game: Pick<IshaaraPublic, 'log'>): Record<Team, TeamTally> {
  const t: Record<Team, TeamTally> = { sun: blank(), moon: blank() };
  for (const e of game.log) {
    const x = t[e.team];
    if (e.type === 'guess') {
      if (e.identity === e.team) x.wordsFound++;
      else x.wrongPicks++;
      if (e.identity === 'trap') x.trapHit = true;
    } else if (e.type === 'clue') {
      x.clues++;
      if (typeof e.number === 'number') {
        x.clueSum += e.number;
        x.finiteClues++;
      }
    } else if (e.type === 'not-allowed') {
      // The ruling is logged under the team that called it; the penalty is the other team's.
      t[e.team === 'sun' ? 'moon' : 'sun'].penalties++;
    }
  }
  return t;
}

/**
 * The derived rows written when a game ends (ishaara_game_players). Guessing is shared, so each seat gets its team's
 * picks; clues and penalties belong to the clue-giver. An abandoned game has no winner.
 */
export function playerRows(game: IshaaraPublic): IshaaraPlayerRow[] {
  const t = tally(game);
  return game.players.map((p) => {
    const x = t[p.team];
    const giver = p.role === 'clue-giver';
    return {
      playerId: p.playerId as string,
      team: p.team,
      role: p.role,
      won: game.winner === p.team,
      wordsFound: x.wordsFound,
      wrongPicks: x.wrongPicks,
      trapHit: x.trapHit,
      cluesGiven: giver ? x.clues : 0,
      avgClueNumber: giver && x.finiteClues > 0 ? x.clueSum / x.finiteClues : null,
      penalties: giver ? x.penalties : 0,
    };
  });
}

/** How many cards are face up: the server's round_count, so a game nobody played can be pruned. */
export const revealedCount = (game: Pick<IshaaraPublic, 'revealed'>) =>
  game.revealed.filter((r) => r !== null).length;
