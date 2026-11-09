import { useState } from 'react';
import { useSeating } from '@/components/seating/useSeating';
import { loadSession } from '@/state/persistence';
import { ktSetup as s } from '@/games/kaali-teeri/strings/setup';
import { useSetup } from './SetupFrame';

/** Kaali Teeri's seating: the shared flow over the setup in the store; seat 1 deals first unless step 3 moves it. */
export function useKtSeating() {
  const { su, actions } = useSetup();
  const [session] = useState(loadSession);
  const seating = useSeating({
    seats: su.seats,
    n: su.n,
    dir: su.dir,
    session,
    firstPrompt: s.dealingFirst,
    onSeat: (k, seat) => {
      actions.setupSeat(k, seat);
      actions.vib();
    },
  });
  return { su, actions, ...seating };
}
