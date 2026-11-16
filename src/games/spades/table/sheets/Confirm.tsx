import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { hasDone } from '@/games/spades/table/state/select';
import { Modal } from '@/components/ui/Modal';

const c = spTable.confirm;

/** End game, Call it a draw and Cancel game each ask first; cancelling with nothing scored says it discards the game. */
export default function Confirm() {
  const { state, actions } = useSp();
  const kind = state.modal;
  if (!kind) return null;
  const copy = kind === 'cancel' && !hasDone(state.game) ? c.discard : c[kind];
  return (
    <Modal
      text={copy.text}
      body={copy.body}
      ok={copy.ok}
      cancel={c.keep}
      danger={kind === 'cancel'}
      onCancel={() => actions.ask(null)}
      onOk={() => {
        actions.ask(null);
        if (kind === 'end') actions.endGame();
        else if (kind === 'draw') actions.drawGame();
        else actions.cancelGame();
      }}
    />
  );
}
