import { partnerOf, seatsOf, teamOf } from '@/games/spades/domain/seats';
import type { Seat, TeamId } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';

/** The most characters of a name a team label shows. */
const NAME_MAX = 8;

/** A name cut to fit a label; counts whole characters, so an emoji is never split. */
export function shortName(name: string): string {
  const chars = Array.from(name);
  return chars.length > NAME_MAX ? chars.slice(0, NAME_MAX - 1).join('') + '…' : name;
}

/**
 * Each team named by its two players. A player sees their own team as "You & partner"; someone watching
 * (`me === null`) sees both pairs. `names` is by seat.
 */
export function teamLabels(me: Seat | null, names: readonly string[]): Record<TeamId, string> {
  const label = (team: TeamId) => {
    const [p, q] = seatsOf(team);
    if (me !== null && teamOf(me) === team) {
      return s.team.pair(s.seat.you, shortName(names[partnerOf(me)]));
    }
    return s.team.pair(shortName(names[p]), shortName(names[q]));
  };
  return { a: label('a'), b: label('b') };
}

/** The two teams, the viewer's own first. */
export const teamOrder = (me: Seat | null): readonly [TeamId, TeamId] =>
  me !== null && teamOf(me) === 'b' ? ['b', 'a'] : ['a', 'b'];
