import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useRef, type CSSProperties } from 'react';
import { curRound } from '@/domain';
import { useApp } from '@/state/store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { MQ } from '@/theme/breakpoints';
import { palette } from '@/theme/palette';
import { TR } from '@/theme/trumps';
import { Home } from '@/screens/Home';
import { Bidding } from '@/screens/round/Bidding';
import { Play } from '@/screens/round/Play';
import { Results } from '@/screens/round/Results';
import { RoundStart } from '@/screens/round/RoundStart';
import { Summary } from '@/screens/round/Summary';
import { Setup } from '@/screens/setup/Setup';
import { SheetHost } from '@/sheets/SheetHost';
import { ConfirmModal } from './ConfirmModal';
import { RepairSaveModal } from './RepairSaveModal';
import { StreakCelebration } from './StreakCelebration';
import { UpdatePrompt } from './UpdatePrompt';
import { Banner } from './ui/Banner';
import { Toast } from './ui/Toast';
import { EASE, SPRING_SOFT } from './ui/motion';

const Winner = lazy(() => import('@/screens/Winner'));
// The large-screen UI is its own chunk, so phones never download it.
const DeskShell = lazy(() => import('@/screens/desk/DeskShell'));
const Confetti = lazy(() => import('./ui/Confetti').then((m) => ({ default: m.Confetti })));

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
  const screenKey = screen === 'round' ? `round-${game.ui.view}-${r.phase}` : screen;
  const rm = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  useVisualViewport(root);
  const variants = {
    enter: (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: d * 36, scale: 0.985 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: d * -36, scale: 0.985 }),
  };
  const blocked = !!(sheet || modal || seq || state.corrupt || state.streakFx);
  // Confetti is skipped under reduced motion; the podium still marks the moment.
  useEffect(() => {
    if (rm && fresh) actions.setFresh(false);
  }, [rm, fresh, actions]);
  let content;
  if (screen === 'home') content = <Home />;
  else if (screen === 'setup') content = <Setup />;
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
      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={rm ? undefined : { scale: sheet || modal ? 0.975 : 1 }}
        transition={SPRING_SOFT}
        {...(blocked ? { inert: '' as const } : {})}
      >
        <div
          aria-hidden
          className="ambient pointer-events-none absolute -top-32 left-1/2 h-[max(360px,45vh)] w-[max(520px,70vw)] rounded-full opacity-90 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, var(--glow), transparent)' }}
        />
        <AnimatePresence custom={dir} initial={false} mode="popLayout">
          <motion.div
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
          </motion.div>
        </AnimatePresence>
        <Banner banner={banner} />
      </motion.div>
      <UpdatePrompt />
      <Toast toast={toast} onUndo={actions.undo} />
      <AnimatePresence>{sheet && <SheetHost key={sheet.type} />}</AnimatePresence>
      <AnimatePresence>{modal && <ConfirmModal key={modal} kind={modal} />}</AnimatePresence>
      <AnimatePresence>{seq && <RoundStart key="seq" />}</AnimatePresence>
      <AnimatePresence>{state.streakFx && <StreakCelebration key="streak" />}</AnimatePresence>
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
