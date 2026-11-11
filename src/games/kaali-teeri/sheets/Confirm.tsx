import { doneHands } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { end } from '@/games/kaali-teeri/strings/end';
import { Modal } from '@/components/ui/Modal';

/** Finish and Abandon ask first. Abandoning with no hand scored discards the game, so it says so. */
export default function Confirm() {
  const { state, actions } = useKt();
  const kind = state.modal;
  if (!kind) return null;
  const empty = !state.game || !doneHands(state.game).length;
  const copy =
    kind === 'finish' ? end.confirm.finish : empty ? end.confirm.discard : end.confirm.abandon;
  return (
    <Modal
      text={copy.text}
      body={'body' in copy ? copy.body : undefined}
      ok={copy.ok}
      danger={kind === 'abandon'}
      onCancel={() => actions.ask(null)}
      onOk={() => {
        actions.ask(null);
        if (kind === 'finish') actions.finishGame();
        else actions.abandon();
      }}
    />
  );
}
