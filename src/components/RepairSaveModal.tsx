import { useApp } from '@/state/store';
import { Modal } from './ui/Modal';

/** Shown instead of silently overwriting a saved game that can't be parsed. */
export function RepairSaveModal() {
  const { actions } = useApp();
  return (
    <Modal
      locked
      text="Saved game couldn't be read. Reset starts fresh. Keep backup starts fresh too, but stores a copy of the unreadable data on this device."
      cancel="Keep backup"
      ok="Reset"
      danger
      onCancel={() => actions.repairSave('keep')}
      onOk={() => actions.repairSave('reset')}
    />
  );
}
