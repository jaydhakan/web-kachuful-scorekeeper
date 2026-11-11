import type { Direction, Seat } from '@/people';
import { circle, people, type Person } from '@/state/registry';
import type { Session } from '@/state/persistence';
import { useArchive } from '@/state/useArchive';
import { t } from '@/strings';
import type { FullName } from './SamePerson';
import { findPerson, isSeated, lookFor } from './seatLook';

export interface SeatingOptions {
  seats: (Seat | null)[];
  n: number;
  dir: Direction;
  /** Signed in, only this account's circle is suggested and anyone else needs an email. */
  session: Session | null;
  /** Fills seat `k`; the game stores it (and buzzes). */
  onSeat: (k: number, seat: Seat) => void;
  /** What the first empty seat asks for when it is seat 1 (a game's own rule, e.g. who deals first). */
  firstPrompt: string;
}

/** The next empty seat and who can take it, for any game; shared by the one-tap chips and the Add player form. */
export function useSeating({ seats, n, dir, session, onSeat, firstPrompt }: SeatingOptions) {
  const tgt = seats.findIndex((s) => !s),
    filled = seats.filter(Boolean).length;
  const prompt = (() => {
    if (tgt < 0) return t.setup.everyoneSeated;
    if (tgt === 0) return firstPrompt;
    const pv = seats[(tgt - 1 + n) % n],
      pn = pv ? pv.name : t.setup.thePlayerBefore;
    return seats.filter((x) => !x).length === 1 && tgt === n - 1
      ? t.setup.finally(pn, dir)
      : t.setup.sittingOn(pn, dir);
  })();
  const signedIn = !!session;
  const known = useArchive(() =>
    session ? circle(session.user.id, session.player?.id ?? null) : people(),
  );
  // Seated under one name, a person leaves the list under all of them.
  const free = known.filter((x) => !isSeated(x, seats));
  const seat = (raw: string, person?: Person, extra: { email?: string } & FullName = {}) => {
    const look = lookFor(person ?? findPerson(known, raw), seats, tgt);
    onSeat(tgt, { name: raw.charAt(0).toUpperCase() + raw.slice(1), ...look, ...extra });
  };
  return { n, seats, tgt, filled, prompt, signedIn, known, free, seat };
}

export type Seating = ReturnType<typeof useSeating>;
