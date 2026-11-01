import { AnimatePresence, m } from 'framer-motion';
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
  onDismiss,
}: {
  toast: ToastData | null;
  onUndo: () => void;
  onOpen?: (r: Route) => void;
  onDismiss?: () => void;
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
          <m.div
            key={toast.id}
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SPRING}
            // A flick up sends it back where it came from (design spec: toast swipe to dismiss); a short drag springs back.
            drag={onDismiss ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.6, bottom: 0.05 }}
            onDragEnd={(_e, i) => {
              if (i.offset.y + i.velocity.y * 0.2 < -24) onDismiss?.();
            }}
            className={`pointer-events-auto flex min-h-11 max-w-full items-center gap-1 mat-toast rounded-full text-15 font-semibold leading-tight [[data-desk]_&]:min-h-9 ${act ? 'pl-4 pr-1' : 'px-4'}`}
          >
            <span className="py-1.5 [text-wrap:balance]">{toast.msg}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={onUndo}
                // On the large screen the pill is slimmer than the button; the button keeps its 44px target.
                className="press min-h-11 shrink-0 rounded-full px-3 mat-toast-act font-extrabold [[data-desk]_&]:-my-1"
              >
                {t.common.undo}
              </button>
            )}
            {!toast.undo && toast.link && onOpen && (
              <button
                type="button"
                onClick={() => toast.link && onOpen(toast.link.route)}
                className="press min-h-11 shrink-0 rounded-full px-3 mat-toast-act font-extrabold [[data-desk]_&]:-my-1"
              >
                {toast.link.label}
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
