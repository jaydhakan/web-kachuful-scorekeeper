import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react';
import { curHand } from '@/games/kaali-teeri/state/select';
import { useKt } from '@/games/kaali-teeri/state/store';
import { ktDesk as kd } from '@/games/kaali-teeri/strings/desk';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useShortcuts, type Shortcuts } from '@/hooks/useShortcuts';
import { whenIdle } from '@/lib/idle';
import { TR } from '@/theme/trumps';
import { KeysModal } from '@/components/desk/Drawer';
import { Banner } from '@/components/ui/Banner';
import { Loader } from '@/components/ui/Loader';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { EASE, SPRING_SOFT } from '@/components/ui/motion';
import { t } from '@/strings';
import SheetHost from '@/games/kaali-teeri/sheets/SheetHost';
import Confirm from '@/games/kaali-teeri/sheets/Confirm';
import Home from '../Home';
import { KtDeskSummary } from './KtDeskSummary';
import { KtServiceWorker } from '../KtServiceWorker';
import { KtRail, KtTopBar } from './KtNav';
import { KtWorkspace } from './KtWorkspace';
import { useKtDeskKeys } from './useKtDeskKeys';

// Not needed for the first paint; setup is fetched once the page is idle, so New Game still opens at once.
const loadSetup = () => import('../setup/Setup');
const Setup = lazy(loadSetup);
const Deal = lazy(() => import('../setup/Deal'));
const Winner = lazy(() => import('../Winner'));
const Pages = lazy(() => import('../pages/Pages'));

// The toast sits at the top, centred on the content (under the top bar on an upright tablet), where it never covers
// an action; the banner too, clear of the rail. Same offsets as Kachuful's desk.
const OVERLAY_VARS =
  '[--toast-top:calc(var(--sat)+5.875rem)] rail:[--toast-top:calc(var(--sat)+0.375rem)] rail:[--toast-x:88px] rail:[--toast-w:calc(100%-88px)] [--main-w:min(32rem,calc(100%-3rem))] [--main-x:calc((100%-var(--main-w))/2)] rail:[--main-x:calc(88px+(100%-88px-var(--main-w))/2)]';

/** A screen's own keys, mounted inside its animated layer so they stop while it leaves. */
function ScreenKeys({ map }: { map: Shortcuts }) {
  useKtDeskKeys(map);
  return null;
}

/**
 * Kaali Teeri on tablets and desktops: rail (or top bar), one content area, sheets as panels and modals. A hand is
 * one mounted workspace; home, setup, the summary and the winner are the phone's screens laid out wide.
 */
export default function KtDeskShell() {
  const { state, actions } = useKt();
  const { game, screen, dir, sheet, modal, toast, banner, deal } = state;
  const trump = (game && curHand(game)?.trump) || 'spades';
  const th = TR[trump];
  const rm = useReducedMotion();
  const [keys, setKeys] = useState(false);
  const updateDue = useServiceWorker().needRefresh;
  const dealing = !!deal && screen === 'game' && !!game;
  const blocked = !!(sheet || modal || dealing || state.corrupt || updateDue || keys);
  const inGame = !!game && (screen === 'game' || screen === 'winner');
  useEffect(() => whenIdle(() => void loadSetup()), []);
  useShortcuts(
    {
      '?': () => setKeys(true),
      i: () => actions.openSheet({ type: 'rules' }),
      ...(game && { b: () => actions.openSheet({ type: 'board' }) }),
      ...(inGame && { z: actions.undo, undo: actions.undo }),
    },
    !blocked,
  );

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
      <>
        <ScreenKeys map={{ r: actions.rematch, n: actions.startSetup }} />
        <Suspense fallback={<Loader />}>
          <Winner />
        </Suspense>
      </>
    );
  else if (screen === 'game' && game) {
    const h = curHand(game);
    if (game.ui.view === 'summary' || h.phase === 'done') {
      key = `sum-${h.index}`;
      content = (
        <>
          <ScreenKeys map={{ enter: actions.nextHand }} />
          <KtDeskSummary />
        </>
      );
    } else {
      // One key per hand: the workspace stays mounted through its phases and only the action pane moves.
      key = `hand-${h.index}`;
      content = <KtWorkspace g={game} />;
    }
  } else {
    key = 'home';
    content = (
      <>
        <ScreenKeys
          map={{
            n: actions.startSetup,
            ...(game?.status === 'active' && { enter: actions.resume }),
          }}
        />
        <Home />
      </>
    );
  }
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
      data-game="kaali-teeri"
      className={`app-root scr-bg grain relative h-full w-full ${OVERLAY_VARS}`}
      style={{ '--trump': th.acc, '--trump-glow': th.glow, '--suit': th.col } as CSSProperties}
    >
      <m.div
        className="absolute inset-0 flex flex-col rail:flex-row"
        initial={false}
        animate={rm ? undefined : { scale: sheet || modal || keys ? 0.985 : 1 }}
        transition={SPRING_SOFT}
        {...(blocked ? { inert: '' as const } : {})}
      >
        <div
          aria-hidden
          className="ambient pointer-events-none absolute -top-56 left-1/2 box-content h-[max(420px,50vh)] w-[max(640px,60vw)] rounded-full p-16"
        />
        <KtRail onKeys={() => setKeys(true)} />
        <KtTopBar onKeys={() => setKeys(true)} />
        <main className="relative min-h-0 min-w-0 flex-1">
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
        </main>
        <Banner banner={banner} />
      </m.div>
      <KtServiceWorker />
      <Toast toast={toast} onUndo={actions.undo} onDismiss={actions.dismissToast} />
      <AnimatePresence>{sheet && <SheetHost key={sheet.type} />}</AnimatePresence>
      <AnimatePresence>
        {keys && (
          <KeysModal
            key="keys"
            title={kd.keys.title}
            list={kd.keys.list}
            onClose={() => setKeys(false)}
          />
        )}
      </AnimatePresence>
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
