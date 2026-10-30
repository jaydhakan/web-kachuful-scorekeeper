import { AnimatePresence, motion } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useApp } from '@/state/store';
import { SPRING } from './ui/motion';
import { t } from '@/strings';

/** Offers a waiting service-worker update. It never reloads on its own. */
export function UpdatePrompt() {
  const { actions } = useApp();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onOfflineReady: () => actions.say(t.toasts.offlineReady) });
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(4.25rem+var(--sat))] z-[67] flex justify-center pl-[max(1rem,var(--sal))] pr-[max(1rem,var(--sar))] land:top-[calc(3.5rem+var(--sat))]">
      <AnimatePresence>
        {needRefresh && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING}
            className="glass pointer-events-auto flex min-h-12 items-center gap-1 !rounded-full !bg-toast/90 py-1.5 pl-5 pr-1.5 text-16 font-medium"
          >
            <span className="whitespace-nowrap">{t.update.newVersion}</span>
            <button
              type="button"
              onClick={() => void updateServiceWorker(true)}
              className="min-h-11 rounded-full px-3 font-extrabold text-[var(--accent)]"
            >
              {t.update.reload}
            </button>
            <button
              type="button"
              aria-label={t.update.notNow}
              onClick={() => setNeedRefresh(false)}
              className="grid h-11 w-11 place-items-center rounded-full text-[var(--tx2)]"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
