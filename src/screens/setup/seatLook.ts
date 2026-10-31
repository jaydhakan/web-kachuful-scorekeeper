import { COLORS, EMOJIS, nameKey } from '@/domain';
import type { Person } from '@/state/registry';
import type { Seat } from '@/state/types';

export const findPerson = (known: Person[], name: string): Person | undefined =>
  known.find((p) => p.nameKey === nameKey(name));

/**
 * A seat's emoji, colour and registry id: a known player keeps their own look unless someone at the table already
 * has that emoji or colour, in which case the seat's default is used.
 */
export function lookFor(
  who: Person | undefined,
  seats: (Seat | null)[],
  k: number,
): Pick<Seat, 'emoji' | 'color' | 'playerId'> {
  const others = seats.filter((s, i): s is Seat => !!s && i !== k);
  const emoji = who && !others.some((s) => s.emoji === who.emoji) ? who.emoji : EMOJIS[k];
  const color = who && !others.some((s) => s.color === who.color) ? who.color : COLORS[k];
  return { emoji, color, ...(who && { playerId: who.id }) };
}
