import { useApp } from '@/state/store';
import type { ModalKind } from '@/state/types';
import { Modal } from './ui/Modal';
import { t } from '@/strings';

const COPY: Record<ModalKind, { text: string; ok: string }> = t.modals;

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
