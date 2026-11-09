import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useRef, type CSSProperties } from 'react';
import { curHand } from '@/games/kaali-teeri/state/select';
import { useKt } from '@/games/kaali-teeri/state/store';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { whenIdle } from '@/lib/idle';
import { TR } from '@/theme/trumps';
import { Banner } from '@/components/ui/Banner';
import { Loader } from '@/components/ui/Loader';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { EASE, SPRING_SOFT } from '@/components/ui/motion';
import { t } from '@/strings';
import Home from './Home';
import HandView from './hand/HandView';
import SheetHost from '@/games/kaali-teeri/sheets/SheetHost';
import Confirm from '@/games/kaali-teeri/sheets/Confirm';
import { KtServiceWorker as ServiceWorker } from './KtServiceWorker';

// Never the first screen, so out of the first load; fetched once the page is idle, before anyone taps.
const loadSetup = () => import('./setup/Setup');
const Setup = lazy(loadSetup);
const Deal = lazy(() => import('./setup/Deal'));
const Winner = lazy(() => import('./Winner'));
const Pages = lazy(() => import('./pages/Pages'));

/** Kaali Teeri's phone UI: one screen at a time, sheets and modals over it, toasts with Undo, the deal between hands. */
export default function KtShell() {
  const { state, actions } = useKt();
  const { game, screen, dir, sheet, modal, toast, banner, deal } = state;
  const trump = (game && curHand(game)?.trump) || 'spades';
  const th = TR[trump];
  const rm = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  useVisualViewport(root);
  const updateDue = useServiceWorker().needRefresh;
  const dealing = !!deal && screen === 'game' && !!game;
  const blocked = !!(sheet || modal || dealing || state.corrupt || updateDue);
  useEffect(() => whenIdle(() => void loadSetup()), []);

  let key: string = screen,
    content;
  const page = state.pages.at(-1);
  if (page) {
    key = `page-${state.pages.length}`;
    content = (
      <Suspense fallback={<Loader />}>
        <Pages route={page} />
      </Suspense>
    );
  } else if (screen === 'setup')
    content = (
      <Suspense fallback={<Loader />}>
        <Setup />
      </Suspense>
    );
  else if (screen === 'winner' && game)
    content = (
      <Suspense fallback={<Loader />}>
        <Winner />
      </Suspense>
    );
  else if (screen === 'game' && game) {
    const h = curHand(game);
    key =
      game.ui.view === 'summary' || h.phase === 'done' ? `sum-${h.index}` : `${h.phase}-${h.index}`;
    content = <HandView />;
  } else {
    key = 'home';
    content = <Home />;
  }
  const variants = {
    enter: (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: d * 36, scale: 0.985 }),
    center: { opacity: 1, x: 0, scale: 1 },
    // The old screen leaves faster than the new one arrives, so the two overlap less.
    exit: (d: number) => ({
      ...(rm ? { opacity: 0 } : { opacity: 0, x: d * -36, scale: 0.985 }),
      transition: { duration: 0.26, ease: EASE },
    }),
  };
  return (
    <div
      ref={root}
      data-game="kaali-teeri"
      className="app-root scr-bg grain relative h-full w-full"
      style={{ '--trump': th.acc, '--trump-glow': th.glow, '--suit': th.col } as CSSProperties}
    >
      {/* The page recedes while a sheet or modal is over it: transform only, and not at all under reduced motion. */}
      <m.div
        className="absolute inset-0"
        initial={false}
        animate={rm ? undefined : { scale: sheet || modal ? 0.975 : 1 }}
        transition={SPRING_SOFT}
        {...(blocked ? { inert: '' as const } : {})}
      >
        <div
          aria-hidden
          className="ambient pointer-events-none absolute -top-48 left-1/2 box-content h-[max(360px,45vh)] w-[max(520px,70vw)] rounded-full p-16 opacity-90"
        />
        <AnimatePresence custom={dir} initial={false} mode="popLayout">
          <m.div
            key={key}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.42, ease: EASE }}
            className="absolute inset-0"
          >
            {content}
          </m.div>
        </AnimatePresence>
        <Banner banner={banner} />
      </m.div>
      <ServiceWorker />
      <Toast toast={toast} onUndo={actions.undo} onDismiss={actions.dismissToast} />
      <AnimatePresence>{sheet && <SheetHost key={sheet.type} />}</AnimatePresence>
      <AnimatePresence>{modal && <Confirm key={modal} />}</AnimatePresence>
      <AnimatePresence>
        {dealing && (
          <Suspense key={`deal-${deal.index}`} fallback={null}>
            <Deal />
          </Suspense>
        )}
      </AnimatePresence>
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
    </div>
  );
}
