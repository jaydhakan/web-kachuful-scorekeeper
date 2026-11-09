import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useRef, type CSSProperties } from 'react';
import { whenIdle } from '@/lib/idle';
import { curRound } from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { routeKey } from '@/games/kachuful/lib/route';
import { palette, themeConfetti } from '@/theme/palette';
import { TR } from '@/theme/trumps';
import { Home } from '@/games/kachuful/screens/Home';
import { Bidding } from '@/games/kachuful/screens/round/Bidding';
import { Play } from '@/games/kachuful/screens/round/Play';
import { Results } from '@/games/kachuful/screens/round/Results';
import { RoundStart } from '@/games/kachuful/screens/round/RoundStart';
import { Summary } from '@/games/kachuful/screens/round/Summary';
import { SheetHost } from '@/games/kachuful/sheets/SheetHost';
import { ConfirmModal } from './ConfirmModal';
import { RepairSaveModal } from './RepairSaveModal';
import { HostLive } from './HostLive';
import { BadgePop } from './BadgePop';
import { Banner } from '@/components/ui/Banner';
import { Loader } from '@/components/ui/Loader';
import { ServiceWorkerHost } from '@/components/ServiceWorkerHost';
import { Toast } from '@/components/ui/Toast';
import { EASE, SPRING_SOFT } from '@/components/ui/motion';

const Winner = lazy(() => import('@/games/kachuful/screens/Winner'));
const Pages = lazy(() => import('@/games/kachuful/screens/pages/Pages'));
const Confetti = lazy(() =>
  import('@/components/ui/Confetti').then((m) => ({ default: m.Confetti })),
);
// Never on the first screen, so out of the first load; fetched once the page is idle, before anyone taps.
const loadSetup = () =>
  import('@/games/kachuful/screens/setup/Setup').then((m) => ({ default: m.Setup }));
const loadStreak = () =>
  import('./StreakCelebration').then((m) => ({ default: m.StreakCelebration }));
const Setup = lazy(loadSetup);
const StreakCelebration = lazy(loadStreak);

/** The phone UI (and phones on their side); its own chunk, so tablets and desktops never download it. */
export default function PhoneShell() {
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
  const updateDue = useServiceWorker().needRefresh;
  const blocked = !!(sheet || modal || seq || state.corrupt || state.streakFx || updateDue);
  useEffect(() => whenIdle(() => void Promise.all([loadSetup(), loadStreak()])), []);
  // Confetti is skipped under reduced motion; the podium still marks the moment.
  useEffect(() => {
    if (rm && fresh) actions.setFresh(false);
  }, [rm, fresh, actions]);
  let content;
  if (top)
    content = (
      <Suspense fallback={<Loader />}>
        <Pages route={top} />
      </Suspense>
    );
  else if (screen === 'home') content = <Home />;
  else if (screen === 'setup')
    content = (
      <Suspense fallback={<Loader />}>
        <Setup />
      </Suspense>
    );
  else if (screen === 'winner')
    content = (
      <Suspense fallback={<Loader />}>
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
      style={{ '--trump': th.acc, '--trump-glow': th.glow, '--suit': th.col } as CSSProperties}
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
      <ServiceWorkerHost />
      <Toast
        toast={toast}
        onUndo={actions.undo}
        onOpen={actions.open}
        onDismiss={actions.dismissToast}
      />
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
      <HostLive />
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
