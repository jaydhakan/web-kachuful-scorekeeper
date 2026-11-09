import { useCallback } from 'react';
import { AddPlayerForm } from '@/components/seating/AddPlayerForm';
import { useSeatPlayer } from '@/games/kachuful/screens/setup/useSeatPlayer';

/** The Add player sheet: the shared form over Kachuful's setup. */
export function AddPlayerBody({ name }: { name?: string }) {
  const seating = useSeatPlayer(),
    { actions } = seating;
  const close = useCallback(() => actions.openSheet(null), [actions]);
  return (
    <AddPlayerForm
      seating={seating}
      name={name}
      onClose={close}
      say={actions.say}
      vib={actions.vib}
    />
  );
}
