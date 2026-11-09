import { useApp } from '@/games/kachuful/state/store';

/** Setup screens only render while a setup is in progress. */
export function useSetup() {
  const { state, actions } = useApp();
  if (!state.setup) throw new Error('Setup state missing');
  return { su: state.setup, actions };
}
