import { AnimatePresence, m, useIsPresent, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import type { TablePage } from '@/games/spades/nav';
import { useSp } from '@/games/spades/table/state/store';
import { curHand } from '@/games/spades/table/state/select';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { whenIdle } from '@/lib/idle';
import { Loader } from '@/components/ui/Loader';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { EASE, SPRING_SOFT } from '@/components/ui/motion';
import { t } from '@/strings';
import SheetHost from '@/games/spades/table/sheets/SheetHost';
import Confirm from '@/games/spades/table/sheets/Confirm';
import Bids from './hand/Bids';
import Summary from './hand/Summary';
import Tricks from './hand/Tricks';

// Never the first thing on screen in a game in progress: fetched once the page is idle.
const loadSetup = () => import('./setup/Setup');
const Setup = lazy(loadSetup);
const Winner = lazy(() => import('./Winner'));
const Pages = lazy(() => import('./pages/Pages'));

/** The screen for the state (and a page from the address), with the key its transition runs on. */
export function useScreen(page: TablePage | null): { key: string; content: ReactNode } {
  const { state } = useSp();
  const { game, screen } = state;
  const route = state.pages.at(-1);
  useEffect(() => whenIdle(() => void loadSetup()), []);
  const wait = (c: ReactNode) => <Suspense fallback={<Loader />}>{c}</Suspense>;
  if (route || page)
    return {
      key: route ? `route-${state.pages.length}` : `page-${page}`,
      content: wait(<Pages page={page} route={route ?? null} />),
    };
  if (screen === 'winner' && game) return { key: 'winner', content: wait(<Winner />) };
  const h = screen === 'game' && game ? curHand(game) : null;
  if (game && h) {
    if (h.phase === 'bidding') return { key: `bids-${h.index}`, content: <Bids g={game} h={h} /> };
    if (h.phase === 'tricks')
      return { key: `tricks-${h.index}`, content: <Tricks g={game} h={h} /> };
    return { key: `sum-${h.index}`, content: <Summary g={game} h={h} /> };
  }
  // One key for both steps: a leaving copy re-renders from the store, so a key per step would show the new step twice.
  return { key: 'setup', content: wait(<Setup />) };
}

/** Sheets, the confirmations, the toast and the unreadable-save prompt, over either shell. */
export function Overlays() {
  const { state, actions } = useSp();
  return (
    <>
      <Toast toast={state.toast} onUndo={actions.undo} onDismiss={actions.dismissToast} />
      <AnimatePresence>{state.sheet && <SheetHost key={state.sheet.type} />}</AnimatePresence>
      <AnimatePresence>{state.modal && <Confirm key={state.modal} />}</AnimatePresence>
      <AnimatePresence>
        {state.corrupt && (
          <Modal
            key="repair"
            locked
            text={t.modals.repair.text}
            cancel={t.modals.repair.keep}
            ok={t.modals.repair.reset}
            danger
            onCancel={() => actions.repairSave('keep')}
            onOk={() => actions.repairSave('reset')}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/** A screen on its way out is inert: no taps, no focus, and gone from the accessibility tree while it fades. */
export function Leaving({ children }: { children: ReactNode }) {
  const present = useIsPresent();
  return (
    <div className="absolute inset-0" {...(!present && { inert: '' as const })}>
      {children}
    </div>
  );
}

export function useBlocked() {
  const { state } = useSp();
  const updateDue = useServiceWorker().needRefresh;
  return !!(state.sheet || state.modal || state.corrupt || updateDue);
}

/** The phone's scorekeeper: one screen at a time, sliding by direction, sheets and modals over it. */
export default function Shell({ page }: { page: TablePage | null }) {
  const { state } = useSp();
  const rm = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  useVisualViewport(root);
  const blocked = useBlocked();
  const { key, content } = useScreen(page);
  const variants = {
    enter: (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: d * 36, scale: 0.985 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) => ({
      ...(rm ? { opacity: 0 } : { opacity: 0, x: d * -36, scale: 0.985 }),
      transition: { duration: 0.26, ease: EASE },
    }),
  };
  return (
    <div ref={root} data-game="spades" className="app-root scr-bg grain relative h-full w-full">
      <m.div
        className="absolute inset-0"
        initial={false}
        animate={rm ? undefined : { scale: state.sheet || state.modal ? 0.975 : 1 }}
        transition={SPRING_SOFT}
        {...(blocked ? { inert: '' as const } : {})}
      >
        <AnimatePresence custom={state.dir} initial={false} mode="popLayout">
          <m.div
            key={key}
            custom={state.dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.42, ease: EASE }}
            className="absolute inset-0"
          >
            <Leaving>{content}</Leaving>
          </m.div>
        </AnimatePresence>
      </m.div>
      <Overlays />
    </div>
  );
}
