import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react';
import { useApp } from '@/state/store';
import { useShortcuts } from '@/hooks/useShortcuts';
import { palette } from '@/theme/palette';
import { TR } from '@/theme/trumps';
import { RoundStart } from '@/screens/round/RoundStart';
import { SheetHost } from '@/sheets/SheetHost';
import { ConfirmModal } from '@/components/ConfirmModal';
import { RepairSaveModal } from '@/components/RepairSaveModal';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { Banner } from '@/components/ui/Banner';
import { Toast } from '@/components/ui/Toast';
import { EASE, SPRING_SOFT } from '@/components/ui/motion';
import { DeskHome } from './DeskHome';
import { DeskScoreboard } from './DeskScoreboard';
import { DeskSetup } from './DeskSetup';
import { DeskSummary } from './DeskSummary';
import { DeskWinner } from './DeskWinner';
import { KeysModal } from './Drawer';
import { Rail, TopBar } from './Nav';
import { RulesDrawer } from './RulesDrawer';
import { UpcomingDrawer } from './UpcomingDrawer';
import { Workspace } from './Workspace';

const Confetti = lazy(() =>
  import('@/components/ui/Confetti').then((m) => ({ default: m.Confetti })),
);

// The toast sits at the top, centred on the content, where it never covers an action; the banner too, clear of the rail.
const OVERLAY_VARS =
  '[--bar-h:calc(100%-9.5rem-var(--sat))] rail:[--bar-h:calc(100%-5.5rem-var(--sat))] [--main-w:min(32rem,calc(100%-3rem))] [--main-x:calc((100%-var(--main-w))/2)] rail:[--bar-x:88px] rail:[--bar-w:calc(100%-88px)] rail:[--main-x:calc(88px+(100%-88px-var(--main-w))/2)]';

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
  const blocked = overlay || !!modal || !!seq || state.corrupt || keys;
  const inGame = screen === 'round' || screen === 'winner';
  useEffect(() => {
    if (rm && fresh) actions.setFresh(false);
  }, [rm, fresh, actions]);
  useShortcuts(
    {
      '?': () => setKeys(true),
      ...(inGame && { z: actions.undo, undo: actions.undo }),
    },
    !blocked,
  );
  const key = screen === 'round' ? (game.ui.view === 'summary' ? 'summary' : 'round') : screen;
  const content =
    screen === 'home' ? (
      <DeskHome />
    ) : screen === 'setup' ? (
      <DeskSetup />
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
    exit: (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: d * -48, scale: 0.985 }),
  };
  return (
    <div
      data-desk
      className={`app-root scr-bg grain relative h-full w-full ${OVERLAY_VARS}`}
      style={{ '--accent': th.acc, '--glow': th.glow, '--suit': th.col } as CSSProperties}
    >
      <motion.div
        className="absolute inset-0 flex flex-col rail:flex-row"
        initial={false}
        animate={rm ? undefined : { scale: overlay || modal || keys ? 0.985 : 1 }}
        transition={SPRING_SOFT}
        {...(blocked ? { inert: '' as const } : {})}
      >
        <div
          aria-hidden
          className="ambient pointer-events-none absolute -top-40 left-1/2 h-[max(420px,50vh)] w-[max(640px,60vw)] rounded-full opacity-90 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, var(--glow), transparent)' }}
        />
        <Rail onKeys={() => setKeys(true)} />
        <TopBar onKeys={() => setKeys(true)} />
        <main className="relative min-h-0 min-w-0 flex-1">
          <div className="absolute inset-0" {...(board ? { inert: '' as const } : {})}>
            <AnimatePresence custom={dir} initial={false} mode="popLayout">
              <motion.div
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
              </motion.div>
            </AnimatePresence>
          </div>
          <AnimatePresence>{board && <DeskScoreboard key="board" />}</AnimatePresence>
        </main>
        <Banner banner={banner} />
      </motion.div>
      <UpdatePrompt />
      <Toast toast={toast} onUndo={actions.undo} />
      <AnimatePresence>
        {overlay &&
          (sheet.type === 'rules' ? (
            <RulesDrawer key="rules" />
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
