import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { SPRING } from '@/components/ui/motion';
import { dismiss, useNotice } from './notice';

/** The platform's notice slot, at the foot of the screen: on the landing page and over any game. */
export function PlatformNotice() {
  const n = useNotice();
  const reduced = !!useReducedMotion();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+var(--sab))] z-[66] flex justify-center px-4"
    >
      <AnimatePresence>
        {n && (
          <m.div
            key={n.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            transition={reduced ? { duration: 0.15 } : SPRING}
            className={`mat-toast pointer-events-auto flex min-h-11 max-w-[min(100%,32rem)] items-center gap-1 rounded-full text-15 font-semibold ${n.action ? 'pl-4 pr-1' : 'px-4'}`}
          >
            <span className="py-1.5 [overflow-wrap:anywhere]">{n.msg}</span>
            {n.action && (
              <button
                type="button"
                onClick={() => {
                  n.action!.run();
                  dismiss(n.id);
                }}
                className="mat-toast-act press min-h-11 shrink-0 rounded-full px-3 font-extrabold"
              >
                {n.action.label}
              </button>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
