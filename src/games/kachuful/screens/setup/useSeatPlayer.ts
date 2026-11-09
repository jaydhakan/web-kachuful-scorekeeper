import { circle, people, type Person } from '@/state/registry';
import { useApp } from '@/games/kachuful/state/store';
import { useArchive } from '@/state/useArchive';
import { t } from '@/strings';
import type { FullName } from './SamePerson';
import { findPerson, isSeated, lookFor } from './seatLook';
import { useSetup } from './useSetup';

/** The next empty seat and who can take it; shared by step 2's one-tap chips and the Add player sheet. */
export function useSeatPlayer() {
  const { su, actions } = useSetup();
  const { state } = useApp();
  const n = su.n ?? 0,
    seats = su.seats;
  const tgt = seats.findIndex((s) => !s),
    filled = seats.filter(Boolean).length;
  const prompt = (() => {
    if (tgt < 0) return t.setup.everyoneSeated;
    if (tgt === 0) return t.setup.dealingFirst;
    const pv = seats[(tgt - 1 + n) % n],
      pn = pv ? pv.name : t.setup.thePlayerBefore;
    return seats.filter((x) => !x).length === 1 && tgt === n - 1
      ? t.setup.finally(pn, su.dir)
      : t.setup.sittingOn(pn, su.dir);
  })();
  const session = state.session;
  const signedIn = !!session;
  // Signed in, only this account's circle is suggested (and matched by name); anyone else needs an email.
  const known = useArchive(() =>
    session ? circle(session.user.id, session.player?.id ?? null) : people(),
  );
  // Seated under one name, a person leaves the list under all of them.
  const free = known.filter((x) => !isSeated(x, seats));
  const seat = (raw: string, person?: Person, extra: { email?: string } & FullName = {}) => {
    const look = lookFor(person ?? findPerson(known, raw), seats, tgt);
    actions.setupSeat(tgt, { name: raw.charAt(0).toUpperCase() + raw.slice(1), ...look, ...extra });
    actions.vib();
  };
  return { su, actions, n, seats, tgt, filled, prompt, signedIn, known, free, seat };
}
