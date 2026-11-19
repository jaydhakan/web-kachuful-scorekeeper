import { scoreHand } from '@/games/spades/domain/scoring';
import type { SpHand, TeamId } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';
import { fillLine, pickLine } from './pickLine';

/**
 * The line over a finished hand for one team: Boston for or against, else made or set. Null when neither applies
 * (both partners bid Nil). Picked by the seed, so everyone on the team reads the same line.
 */
export function handHeadline(
  hand: SpHand,
  bagsBefore: Record<TeamId, number>,
  mine: TeamId,
  seed: string,
): string | null {
  const [a, b] = hand.teamTricks ?? [0, 0];
  const [ours, theirs] = mine === 'a' ? [a, b] : [b, a];
  const lines = s.summary.lines;
  if (ours === 13) return pickLine(lines.boston, seed);
  if (theirs === 13) return pickLine(lines.bostonAgainst, seed);
  const res = scoreHand(hand, bagsBefore)[mine];
  if (res.made === true) return pickLine(lines.made, seed);
  if (res.made === false) return fillLine(pickLine(lines.set, seed), { pts: s.sign(res.points) });
  return null;
}
