import { useCallback } from 'react';
import { AddPlayerForm } from '@/components/seating/AddPlayerForm';
import { AvatarPicker, RenameForm, SeatMenu } from '@/components/seating/SeatSheets';
import { useSp } from '@/games/spades/table/state/store';
import { useSpSeating } from '@/games/spades/table/screens/setup/useSpSeating';

/** The shared seating sheets over the scorekeeper's setup. */
export function SeatBody({ k }: { k: number }) {
  const { state, actions } = useSp();
  const s = state.setup?.seats[k];
  if (!s) return null;
  return (
    <SeatMenu
      seat={s}
      onRename={() => actions.openSheet({ type: 'rename', k })}
      onAvatar={() => actions.openSheet({ type: 'avatar', k })}
      onClear={() => {
        actions.setupSeat(k, null);
        actions.openSheet(null);
      }}
    />
  );
}

export function RenameBody({ k }: { k: number }) {
  const { state, actions } = useSp();
  return (
    <RenameForm
      k={k}
      seats={state.setup?.seats ?? []}
      onSave={(name) => {
        actions.setupSeatPatch(k, { name });
        actions.openSheet(null);
      }}
    />
  );
}

export function AvatarBody({ k }: { k: number }) {
  const { state, actions } = useSp();
  const s = state.setup?.seats[k];
  if (!s) return null;
  return (
    <AvatarPicker
      seat={s}
      onPatch={(patch) => actions.setupSeatPatch(k, patch)}
      onDone={() => actions.openSheet(null)}
    />
  );
}

/** The Add player sheet: the shared form over the scorekeeper's setup. */
export default function AddPlayerBody({ name }: { name?: string }) {
  const seating = useSpSeating(),
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
