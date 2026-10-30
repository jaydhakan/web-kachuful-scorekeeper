import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, type CSSProperties } from 'react';
import { curRound } from '@/domain';
import { useApp } from '@/state/store';
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
import { UpdatePrompt } from './UpdatePrompt';
import { Banner } from './ui/Banner';
import { Toast } from './ui/Toast';
import { EASE } from './ui/motion';

const Winner = lazy(() => import('@/screens/Winner'));
const Confetti = lazy(() => import('./ui/Confetti').then((m) => ({ default: m.Confetti })));

export function Phone() {
  const { state, actions, trump } = useApp();
  const { game, screen, dir, seq, sheet, modal, toast, banner, fresh } = state;
  const th = TR[trump];
  const r = curRound(game);
  const screenKey = screen === 'round' ? `round-${game.ui.view}-${r.phase}` : screen;
  const rm = useReducedMotion();
  const variants = {
    enter: (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: d * 36, scale: 0.985 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: d * -36, scale: 0.985 }),
  };
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
      className="app-root scr-bg grain relative h-full w-full overflow-hidden"
      style={{ '--accent': th.acc, '--glow': th.glow, '--suit': th.col } as CSSProperties}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[360px] w-[520px] -translate-x-1/2 rounded-full opacity-90 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, var(--glow), transparent)' }}
        animate={rm ? undefined : { scale: [1, 1.08, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
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
      <UpdatePrompt />
      <Toast toast={toast} onUndo={actions.undo} />
      <AnimatePresence>{sheet && <SheetHost key={sheet.type} />}</AnimatePresence>
      <AnimatePresence>{modal && <ConfirmModal key={modal} kind={modal} />}</AnimatePresence>
      <AnimatePresence>{seq && <RoundStart key="seq" />}</AnimatePresence>
      {fresh && screen === 'winner' && (
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
