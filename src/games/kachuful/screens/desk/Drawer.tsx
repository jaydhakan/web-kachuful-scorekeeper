import { KeysModal as Keys } from '@/components/desk/Drawer';
import { t } from '@/strings';

export { Drawer } from '@/components/desk/Drawer';

/** Kachuful's `?` sheet. */
export const KeysModal = ({ onClose }: { onClose: () => void }) => (
  <Keys title={t.desk.keys.title} list={t.desk.keys.list} onClose={onClose} />
);
