import { wordsLeft, type IshaaraPublic, type Team } from '@/games/ishaara/domain';

/**
 * I2, mind meld: the cards a clue for 3 or more found for its own team, in the order they were found, once every one
 * of them is found; null otherwise. Read from the log, so it holds whether or not the turn has ended since.
 */
export function mindMeld(g: Pick<IshaaraPublic, 'log'>): number[] | null {
  const at = g.log.map((e) => e.type).lastIndexOf('clue');
  const clue = g.log[at];
  if (!clue || typeof clue.number !== 'number' || clue.number < 3) return null;
  const found = g.log
    .slice(at + 1)
    .filter((e) => e.type === 'guess' && e.team === clue.team && e.identity === clue.team)
    .map((e) => e.card!);
  return found.length >= clue.number ? found.slice(0, clue.number) : null;
}

/** I3, photo finish: both teams need exactly one more card, so the next correct card wins the game. */
export const photoFinish = (g: Pick<IshaaraPublic, 'starting' | 'revealed' | 'status'>): boolean =>
  g.status === 'active' && (['sun', 'moon'] as Team[]).every((t) => wordsLeft(g, t) === 1);
