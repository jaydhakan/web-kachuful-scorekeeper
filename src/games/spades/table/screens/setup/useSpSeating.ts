import { useSeating } from '@/components/seating/useSeating';
import { spTable } from '@/games/spades/strings/table';
import { useSession } from '@/sync/session';
import { useSetup } from './SetupFrame';

/** The shared seating flow over the scorekeeper's four seats; seat 1 deals first unless step 2 moves it. */
export function useSpSeating() {
  const { su, actions } = useSetup();
  const session = useSession();
  const seating = useSeating({
    seats: su.seats,
    n: 4,
    dir: su.dir,
    session,
    firstPrompt: spTable.setup.dealingFirst,
    onSeat: (k, seat) => {
      actions.setupSeat(k, seat);
      actions.vib();
    },
  });
  return { su, actions, ...seating };
}
