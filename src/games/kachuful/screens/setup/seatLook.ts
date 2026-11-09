import { COLORS, EMOJIS, nameKey } from '@/games/kachuful/domain';
import { answersTo, type Person } from '@/state/registry';
import type { Seat } from '@/games/kachuful/state/types';

/** The person with this name: a main name first, then an alias. */
export const findPerson = (known: Person[], name: string): Person | undefined => {
  const k = nameKey(name);
  return known.find((p) => p.nameKey === k) ?? known.find((p) => answersTo(p, k));
};

/** Whether this person already has a seat, under any of their names. */
export const isSeated = (p: Person, seats: (Seat | null)[]): boolean =>
  seats.some((s) => s && (s.playerId === p.id || answersTo(p, nameKey(s.name))));

/** Signed in, a seat takes an email first unless the server knows the player or this device has their email. */
export const lacksEmail = (who: Person | undefined) => !who || (who.local && !who.email);

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
