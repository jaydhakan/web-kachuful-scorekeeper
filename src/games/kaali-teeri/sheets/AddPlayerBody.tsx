import { useCallback } from 'react';
import { AddPlayerForm } from '@/components/seating/AddPlayerForm';
import { useKtSeating } from '@/games/kaali-teeri/screens/setup/useKtSeating';

/** The Add player sheet: the shared form over Kaali Teeri's setup. */
export default function AddPlayerBody({ name }: { name?: string }) {
  const seating = useKtSeating(),
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
