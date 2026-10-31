import { AnimatePresence, motion } from 'framer-motion';
import type { Toast as ToastData } from '@/state/types';
import { SPRING } from './motion';

export function Toast({ toast, onUndo }: { toast: ToastData | null; onUndo: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[112px] z-[66] flex justify-center">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={SPRING}
            className="glass pointer-events-auto flex min-h-12 items-center gap-3 !rounded-full !bg-toast/90 py-1.5 pl-5 pr-2 text-16 font-medium"
          >
            <span className="whitespace-nowrap">{toast.msg}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={onUndo}
                className="min-h-11 rounded-full px-3.5 font-extrabold text-[var(--accent)]"
              >
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
