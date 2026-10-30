import { useApp } from '@/state/store';
import type { ModalKind } from '@/state/types';
import { Modal } from './ui/Modal';

const COPY: Record<ModalKind, { text: string; ok: string }> = {
  newGame: { text: 'Start a new game? Your current game will be lost.', ok: 'Start new' },
  endGame: { text: 'End the game and crown the winner?', ok: 'End game' },
};

export function ConfirmModal({ kind }: { kind: ModalKind }) {
  const { actions } = useApp();
  const { text, ok } = COPY[kind];
  return (
    <Modal
      text={text}
      ok={ok}
      danger
      onCancel={() => actions.ask(null)}
      onOk={() => {
        actions.ask(null);
        if (kind === 'newGame') actions.startSetup();
        else actions.finishGame();
      }}
    />
  );
}
