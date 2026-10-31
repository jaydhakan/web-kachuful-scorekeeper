import { useApp } from '@/state/store';
import { Modal } from './ui/Modal';
import { t } from '@/strings';

/** Shown instead of silently overwriting a saved game that can't be parsed. */
export function RepairSaveModal() {
  const { actions } = useApp();
  return (
    <Modal
      locked
      text={t.modals.repair.text}
      cancel={t.modals.repair.keep}
      ok={t.modals.repair.reset}
      danger
      onCancel={() => actions.repairSave('keep')}
      onOk={() => actions.repairSave('reset')}
    />
  );
}
