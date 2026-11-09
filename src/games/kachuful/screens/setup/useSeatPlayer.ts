import { useSeating } from '@/components/seating/useSeating';
import { useApp } from '@/games/kachuful/state/store';
import { t } from '@/strings';
import { useSetup } from './useSetup';

/** Kachuful's seating: the shared flow over the setup in the store; the first seat deals first. */
export function useSeatPlayer() {
  const { su, actions } = useSetup();
  const { state } = useApp();
  const s = useSeating({
    seats: su.seats,
    n: su.n ?? 0,
    dir: su.dir,
    session: state.session,
    firstPrompt: t.setup.dealingFirst,
    onSeat: (k, seat) => {
      actions.setupSeat(k, seat);
      actions.vib();
    },
  });
  return { su, actions, ...s };
}
