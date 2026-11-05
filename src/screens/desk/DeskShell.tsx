import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react';
import { whenIdle } from '@/lib/idle';
import { useApp } from '@/state/store';
import { useShortcuts } from '@/hooks/useShortcuts';
import { palette, themeConfetti } from '@/theme/palette';
import { TR } from '@/theme/trumps';
import { routeKey } from '@/lib/route';
import { RoundStart } from '@/screens/round/RoundStart';
import { SheetHost } from '@/sheets/SheetHost';
import { ConfirmModal } from '@/components/ConfirmModal';
import { RepairSaveModal } from '@/components/RepairSaveModal';
import { StreakCelebration } from '@/components/StreakCelebration';
import { BadgePop } from '@/components/BadgePop';
import { Banner } from '@/components/ui/Banner';
import { ServiceWorkerHost } from '@/components/ServiceWorkerHost';
import { Toast } from '@/components/ui/Toast';
import { EASE, SPRING_SOFT } from '@/components/ui/motion';
import { DeskHome } from './DeskHome';
import { DeskScoreboard } from './DeskScoreboard';
import { DeskSummary } from './DeskSummary';
import { DeskWinner } from './DeskWinner';
import { KeysModal } from './Drawer';
import { Rail, TopBar } from './Nav';
import { UpcomingDrawer } from './UpcomingDrawer';
import { Workspace } from './Workspace';
import { Loader } from '@/components/ui/Loader';

const Pages = lazy(() => import('@/screens/pages/Pages'));
// Not needed for the first paint; fetched once the page is idle, so New Game still opens at once.
const loadSetup = () => import('./DeskSetup');
const DeskSetup = lazy(() => loadSetup().then((m) => ({ default: m.DeskSetup })));
const RulesDrawer = lazy(() => import('./RulesDrawer').then((m) => ({ default: m.RulesDrawer })));
const Confetti = lazy(() =>
  import('@/components/ui/Confetti').then((m) => ({ default: m.Confetti })),
);

// The toast sits at the top, centred on the content, above the page title (under the top bar on an upright tablet),
// where it never covers an action; the banner too, clear of the rail.
const OVERLAY_VARS =
  '[--toast-top:calc(var(--sat)+5.875rem)] rail:[--toast-top:calc(var(--sat)+0.375rem)] rail:[--toast-x:88px] rail:[--toast-w:calc(100%-88px)] [--main-w:min(32rem,calc(100%-3rem))] [--main-x:calc((100%-var(--main-w))/2)] rail:[--main-x:calc(88px+(100%-88px-var(--main-w))/2)]';

/**
 * The tablet and desktop app: rail (or top bar), one content area, drawers on the right. Bidding, Play and Results are
 * one mounted workspace; the Scoreboard slides over it without unmounting it.
 */
export default function DeskShell() {
  const { state, actions, trump } = useApp();
  const { game, screen, dir, seq, sheet, modal, toast, banner, fresh } = state;
  const th = TR[trump];
  const rm = useReducedMotion();
  const [keys, setKeys] = useState(false);
  const board = sheet?.type === 'board' || sheet?.type === 'edit';
  const overlay = !!sheet && !board;
  const blocked = overlay || !!modal || !!seq || !!state.streakFx || state.corrupt || keys;
  const inGame = screen === 'round' || screen === 'winner';
  useEffect(() => {
    if (rm && fresh) actions.setFresh(false);
  }, [rm, fresh, actions]);
  useEffect(() => whenIdle(() => void loadSetup()), []);
  useShortcuts(
    {
      '?': () => setKeys(true),
      ...(inGame && { z: actions.undo, undo: actions.undo }),
    },
    !blocked,
  );
  const top = state.nav.at(-1);
  const key = top
    ? routeKey(top)
    : screen === 'round'
      ? game.ui.view === 'summary'
        ? 'summary'
        : 'round'
      : screen;
  const content = top ? (
    <Suspense fallback={<Loader />}>
      <Pages route={top} />
    </Suspense>
  ) : screen === 'home' ? (
    <DeskHome />
  ) : screen === 'setup' ? (
    <Suspense fallback={<Loader />}>
      <DeskSetup />
    </Suspense>
  ) : screen === 'winner' ? (
    <DeskWinner />
  ) : game.ui.view === 'summary' ? (
    <DeskSummary />
  ) : (
    <Workspace />
  );
  const variants = {
    enter: (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: d * 48, scale: 0.985 }),
    center: { opacity: 1, x: 0, scale: 1 },
    // The old screen leaves faster than the new one arrives, so the two overlap less.
    exit: (d: number) => ({
      ...(rm ? { opacity: 0 } : { opacity: 0, x: d * -48, scale: 0.985 }),
      transition: { duration: 0.26, ease: EASE },
    }),
  };
  return (
    <div
      data-desk
      className={`app-root scr-bg grain relative h-full w-full ${OVERLAY_VARS}`}
      style={{ '--trump': th.acc, '--trump-glow': th.glow, '--suit': th.col } as CSSProperties}
    >
      <m.div
        className="absolute inset-0 flex flex-col rail:flex-row"
        initial={false}
        animate={rm ? undefined : { scale: overlay || modal || keys ? 0.985 : 1 }}
        transition={SPRING_SOFT}
        {...(blocked ? { inert: '' as const } : {})}
      >
        <div
          aria-hidden
          className="ambient pointer-events-none absolute -top-56 left-1/2 box-content h-[max(420px,50vh)] w-[max(640px,60vw)] rounded-full p-16"
        />
        <Rail onKeys={() => setKeys(true)} />
        <TopBar onKeys={() => setKeys(true)} />
        <main className="relative min-h-0 min-w-0 flex-1">
          <div className="absolute inset-0" {...(board ? { inert: '' as const } : {})}>
            <AnimatePresence custom={dir} initial={false} mode="popLayout">
              <m.div
                key={key}
                custom={dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: EASE }}
                className="absolute inset-0"
              >
                {content}
              </m.div>
            </AnimatePresence>
          </div>
          <AnimatePresence>{board && <DeskScoreboard key="board" />}</AnimatePresence>
        </main>
        <Banner banner={banner} />
      </m.div>
      <ServiceWorkerHost />
      <Toast
        toast={toast}
        onUndo={actions.undo}
        onOpen={actions.open}
        onDismiss={actions.dismissToast}
      />
      <AnimatePresence>
        {overlay &&
          (sheet.type === 'rules' ? (
            <Suspense key="rules" fallback={null}>
              <RulesDrawer />
            </Suspense>
          ) : sheet.type === 'upcoming' ? (
            <UpcomingDrawer key="upcoming" />
          ) : (
            <SheetHost key={sheet.type} />
          ))}
      </AnimatePresence>
      <AnimatePresence>
        {keys && <KeysModal key="keys" onClose={() => setKeys(false)} />}
      </AnimatePresence>
      <AnimatePresence>{modal && <ConfirmModal key={modal} kind={modal} />}</AnimatePresence>
      <AnimatePresence>{seq && <RoundStart key="seq" />}</AnimatePresence>
      <AnimatePresence>{state.streakFx && <StreakCelebration key="streak" />}</AnimatePresence>
      <BadgePop />
      <AnimatePresence>{state.corrupt && <RepairSaveModal key="repair" />}</AnimatePresence>
      {fresh && screen === 'winner' && !rm && (
        <Suspense fallback={null}>
          <Confetti
            colors={themeConfetti() ?? [...game.players.map((p) => p.color), palette['gold-light']]}
            onDone={() => actions.setFresh(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
