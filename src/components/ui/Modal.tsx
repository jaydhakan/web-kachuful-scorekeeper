import { motion } from 'framer-motion';
import { PrimaryButton } from './PrimaryButton';
import { SPRING_POP } from './motion';

interface ModalProps {
  text: string;
  ok: string;
  danger?: boolean;
  /** Label for the secondary button. */
  cancel?: string;
  /** A locked modal ignores backdrop taps, so a choice must be made. */
  locked?: boolean;
  onOk: () => void;
  onCancel: () => void;
}

export function Modal({ text, ok, danger, cancel = 'Cancel', locked, onOk, onCancel }: ModalProps) {
  return (
    <div className="absolute inset-0 z-[65] grid place-items-center p-7">
      <motion.div
        className="absolute inset-0 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={locked ? undefined : onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={SPRING_POP}
        className="glass relative w-full max-w-[340px] !rounded-[28px] !bg-sheet/95 p-6"
      >
        <p className="mb-5 text-19 font-medium leading-snug tracking-[-0.012em]">{text}</p>
        <div className="flex gap-2.5">
          <PrimaryButton
            tone="glass"
            onClick={onCancel}
            className="!h-[52px] flex-1 !text-16"
          >
            {cancel}
          </PrimaryButton>
          <PrimaryButton
            tone={danger ? 'danger' : 'accent'}
            onClick={onOk}
            className="!h-[52px] flex-1 !text-16"
          >
            {ok}
          </PrimaryButton>
        </div>
      </motion.div>
    </div>
  );
}
