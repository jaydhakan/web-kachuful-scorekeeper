import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useRef, type CSSProperties } from 'react';
import { whenIdle } from '@/lib/idle';
import { curRound } from '@/domain';
import { useApp } from '@/state/store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { MQ } from '@/theme/breakpoints';
import { routeKey } from '@/lib/route';
import { palette } from '@/theme/palette';
import { TR } from '@/theme/trumps';
import { Home } from '@/screens/Home';
import { Bidding } from '@/screens/round/Bidding';
import { Play } from '@/screens/round/Play';
import { Results } from '@/screens/round/Results';
import { RoundStart } from '@/screens/round/RoundStart';
import { Summary } from '@/screens/round/Summary';
import { SheetHost } from '@/sheets/SheetHost';
import { ConfirmModal } from './ConfirmModal';
import { RepairSaveModal } from './RepairSaveModal';
import { BadgePop } from './BadgePop';
import { UpdatePrompt } from './UpdatePrompt';
import { Banner } from './ui/Banner';
import { Toast } from './ui/Toast';
import { EASE, SPRING_SOFT } from './ui/motion';

const Winner = lazy(() => import('@/screens/Winner'));
const Pages = lazy(() => import('@/screens/pages/Pages'));
// The large-screen UI is its own chunk, so phones never download it.
const DeskShell = lazy(() => import('@/screens/desk/DeskShell'));
const Confetti = lazy(() => import('./ui/Confetti').then((m) => ({ default: m.Confetti })));
// Never on the first screen, so out of the first load; fetched once the page is idle, before anyone taps.
const loadSetup = () => import('@/screens/setup/Setup').then((m) => ({ default: m.Setup }));
const loadStreak = () =>
  import('./StreakCelebration').then((m) => ({ default: m.StreakCelebration }));
const Setup = lazy(loadSetup);
const StreakCelebration = lazy(loadStreak);

/** Phones (and phones on their side) get the phone UI; tablets and desktops get the purpose-built large-screen one. */
export function AppShell() {
  const big = useMediaQuery(MQ.big);
  return big ? (
    <Suspense fallback={<div className="app-root scr-bg h-full w-full" />}>
      <DeskShell />
    </Suspense>
  ) : (
    <PhoneShell />
  );
}

function PhoneShell() {
  const { state, actions, trump } = useApp();
  const { game, screen, dir, seq, sheet, modal, toast, banner, fresh } = state;
  const th = TR[trump];
  const r = curRound(game);
  const top = state.nav.at(-1);
  const screenKey = top
    ? routeKey(top)
    : screen === 'round'
      ? `round-${game.ui.view}-${r.phase}`
      : screen;
  const rm = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  useVisualViewport(root);
  const variants = {
    enter: (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: d * 36, scale: 0.985 }),
    center: { opacity: 1, x: 0, scale: 1 },
    // The old screen leaves faster than the new one arrives, so the two overlap less.
    exit: (d: number) => ({
      ...(rm ? { opacity: 0 } : { opacity: 0, x: d * -36, scale: 0.985 }),
      transition: { duration: 0.26, ease: EASE },
    }),
  };
  const blocked = !!(sheet || modal || seq || state.corrupt || state.streakFx);
  useEffect(() => whenIdle(() => void Promise.all([loadSetup(), loadStreak()])), []);
  // Confetti is skipped under reduced motion; the podium still marks the moment.
  useEffect(() => {
    if (rm && fresh) actions.setFresh(false);
  }, [rm, fresh, actions]);
  let content;
  if (top)
    content = (
      <Suspense fallback={null}>
        <Pages route={top} />
      </Suspense>
    );
  else if (screen === 'home') content = <Home />;
  else if (screen === 'setup')
    content = (
      <Suspense fallback={null}>
        <Setup />
      </Suspense>
    );
  else if (screen === 'winner')
    content = (
      <Suspense fallback={null}>
        <Winner />
      </Suspense>
    );
  else if (game.ui.view === 'summary') content = <Summary />;
  else
    content = r.phase === 'bidding' ? <Bidding /> : r.phase === 'playing' ? <Play /> : <Results />;
  return (
    <div
      ref={root}
      className="app-root scr-bg grain relative h-full w-full"
      style={{ '--accent': th.acc, '--glow': th.glow, '--suit': th.col } as CSSProperties}
    >
      {/* The page recedes while a sheet or modal is over it. Transform only, and not at all under reduced motion. */}
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
            key={screenKey}
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
      <UpdatePrompt />
      <Toast toast={toast} onUndo={actions.undo} onOpen={actions.open} />
      <AnimatePresence>{sheet && <SheetHost key={sheet.type} />}</AnimatePresence>
      <AnimatePresence>{modal && <ConfirmModal key={modal} kind={modal} />}</AnimatePresence>
      <AnimatePresence>{seq && <RoundStart key="seq" />}</AnimatePresence>
      <AnimatePresence>
        {state.streakFx && (
          <Suspense key="streak" fallback={null}>
            <StreakCelebration />
          </Suspense>
        )}
      </AnimatePresence>
      <BadgePop />
      <AnimatePresence>{state.corrupt && <RepairSaveModal key="repair" />}</AnimatePresence>
      {fresh && screen === 'winner' && !rm && (
        <Suspense fallback={null}>
          <Confetti
            colors={[...game.players.map((p) => p.color), palette['gold-light']]}
            onDone={() => actions.setFresh(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
