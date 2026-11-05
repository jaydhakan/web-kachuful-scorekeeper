import { doneRounds } from '@/domain';
import { useApp } from '@/state/store';
import type { ModalKind } from '@/state/types';
import { Modal } from './ui/Modal';
import { t } from '@/strings';

const COPY: Record<ModalKind, { text: string; ok: string }> = t.modals;

/** Ending a game crowns a winner; with no round done there is none, so it is discarded instead. */
export function ConfirmModal({ kind }: { kind: ModalKind }) {
  const { state, actions } = useApp();
  const empty = kind === 'endGame' && !doneRounds(state.game).length;
  const { text, ok } = empty ? t.modals.discard : COPY[kind];
  return (
    <Modal
      text={text}
      ok={ok}
      danger
      onCancel={() => actions.ask(null)}
      onOk={() => {
        actions.ask(null);
        if (empty) actions.discardGame();
        else actions.finishGame();
      }}
    />
  );
}
