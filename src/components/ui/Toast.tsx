import { AnimatePresence, motion } from 'framer-motion';
import type { Route, Toast as ToastData } from '@/state/types';
import { SPRING } from './motion';
import { t } from '@/strings';

/**
 * A small pill that drops into the top bar, between its corner buttons, so it never covers a control or content.
 * The large-screen shell moves it above the page title with --toast-top, --toast-x and --toast-w.
 */
export function Toast({
  toast,
  onUndo,
  onOpen,
}: {
  toast: ToastData | null;
  onUndo: () => void;
  onOpen?: (r: Route) => void;
}) {
  const act = toast?.undo || (toast?.link && onOpen);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-[var(--toast-x,0px)] top-[var(--toast-top,calc(var(--sat)+0.375rem))] z-[66] box-border flex w-[var(--toast-w,100%)] justify-center pl-[calc(3.5rem+var(--sal))] pr-[calc(3.5rem+var(--sar))] land:top-[var(--toast-top,calc(var(--sat)+0.125rem))]"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={SPRING}
            className={`pointer-events-auto flex min-h-11 max-w-full items-center gap-1 rounded-full border border-white/10 bg-toast text-15 font-semibold leading-tight shadow-[0_10px_28px_-8px_rgba(0,0,0,.7)] [[data-desk]_&]:min-h-9 ${act ? 'pl-4 pr-1' : 'px-4'}`}
          >
            <span className="py-1.5 [text-wrap:balance]">{toast.msg}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={onUndo}
                // On the large screen the pill is slimmer than the button; the button keeps its 44px target.
                className="min-h-11 shrink-0 rounded-full px-3 font-extrabold text-[var(--accent)] [[data-desk]_&]:-my-1"
              >
                {t.common.undo}
              </button>
            )}
            {!toast.undo && toast.link && onOpen && (
              <button
                type="button"
                onClick={() => toast.link && onOpen(toast.link.route)}
                className="min-h-11 shrink-0 rounded-full px-3 font-extrabold text-[var(--accent)] [[data-desk]_&]:-my-1"
              >
                {toast.link.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
