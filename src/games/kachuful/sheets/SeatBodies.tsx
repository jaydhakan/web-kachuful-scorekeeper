import { AvatarPicker, RenameForm, SeatMenu } from '@/components/seating/SeatSheets';
import { useApp } from '@/games/kachuful/state/store';

export function SeatBody({ k }: { k: number }) {
  const { state, actions } = useApp();
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
  const { state, actions } = useApp();
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
  const { state, actions } = useApp();
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
