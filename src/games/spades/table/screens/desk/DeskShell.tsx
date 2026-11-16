import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { TRICKS, gameTotals, minBidFor } from '@/games/spades/domain';
import type { TablePage } from '@/games/spades/nav';
import { spGo } from '@/games/spades/nav';
import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { curHand, entryOf, entryOk, toBid } from '@/games/spades/table/state/select';
import { Board } from '@/games/spades/table/sheets/Scoreboard';
import { useShortcuts, type Shortcuts } from '@/hooks/useShortcuts';
import { KeysModal } from '@/components/desk/Drawer';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { EASE, SPRING_SOFT } from '@/components/ui/motion';
import { TEAM_TONE, teamNames } from '../parts';
import { Overlays, useBlocked, useScreen } from '../Screens';

const d = spTable.desk;

/** The keys of the screen on show: digits bid or set team A's tricks, arrows step, Enter moves the hand on. */
function useHandKeys(): Shortcuts {
  const { state, actions } = useSp();
  const g = state.game;
  const h = g && state.screen === 'game' ? curHand(g) : null;
  if (!g || !h || g.status !== 'active') return {};
  if (h.phase === 'bidding') {
    const seat = toBid(h);
    return {
      digit: (e) => {
        if (seat === null) return;
        const v = Number(e.key);
        if ((v === 0 && g.rules.nil) || (v > 0 && v >= minBidFor(seat, h.bids, g.rules)))
          actions.bid(v, false);
      },
      ...(seat === null && { enter: actions.toTricks }),
    };
  }
  if (h.phase === 'tricks') {
    const e = entryOf(state)!;
    return {
      digit: (k) => actions.setTeamA(Math.min(TRICKS, Number(k.key))),
      left: () => actions.setTeamA(e.teamA - 1),
      right: () => actions.setTeamA(e.teamA + 1),
      ...(entryOk(h, e) && { enter: actions.saveHand }),
    };
  }
  return { enter: actions.nextHand };
}

/** The side pane: both totals and every hand, beside the screen that records the next one. */
function ScorePanel() {
  const g = useSp().state.game;
  if (!g) return null;
  const t = gameTotals(g);
  return (
    <aside
      aria-label={spTable.sheets.board}
      className="scroll-thin hidden min-h-0 overflow-y-auto p-5 tl:block"
    >
      <dl className="mb-4 grid grid-cols-2 gap-2">
        {(['a', 'b'] as const).map((k) => (
          <div key={k} className="glass flex flex-col px-4 py-3">
            <dt className={`flex items-center gap-1.5 text-14 font-semibold ${TEAM_TONE[k].text}`}>
              <span aria-hidden className={`h-2 w-2 rounded-full ${TEAM_TONE[k].dot}`} />
              <span className="truncate">{teamNames(g, k)}</span>
            </dt>
            <dd className="disp tick text-40 font-extrabold">{t[k].score}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mono-label mb-2 text-13 text-[var(--tx2)]">{d.hands}</h2>
      <div className="glass p-3">
        <Board g={g} />
      </div>
    </aside>
  );
}

/**
 * The scorekeeper on tablets and desktops: a top bar, the phone's screen in a centred column, and from 1024 wide the
 * scoreboard beside it. Keyboard: 0–9, arrows, Enter, Z, B, I and ? (the shortcuts sheet).
 */
export default function DeskShell({ page }: { page: TablePage | null }) {
  const { state, actions } = useSp();
  const rm = useReducedMotion();
  const [keys, setKeys] = useState(false);
  const blocked = useBlocked() || keys;
  const { key, content } = useScreen(page);
  const playing = !page && !state.pages.length && state.screen !== 'setup' && !!state.game;
  const hand = useHandKeys();
  useShortcuts(
    {
      '?': () => setKeys(true),
      i: () => actions.openSheet({ type: 'rules' }),
      ...(state.game && { b: () => actions.openSheet({ type: 'board' }) }),
      ...(playing && { z: actions.undo, undo: actions.undo }),
      ...(playing && hand),
    },
    !blocked,
  );
  const variants = {
    enter: (n: number) => (rm ? { opacity: 0 } : { opacity: 0, x: n * 48 }),
    center: { opacity: 1, x: 0 },
    exit: (n: number) => ({
      ...(rm ? { opacity: 0 } : { opacity: 0, x: n * -48 }),
      transition: { duration: 0.26, ease: EASE },
    }),
  };
  return (
    <div
      data-desk
      data-game="spades"
      className="app-root scr-bg grain relative h-full w-full [--toast-top:calc(var(--sat)+4.5rem)]"
    >
      <m.div
        className="absolute inset-0 flex flex-col"
        initial={false}
        animate={rm ? undefined : { scale: state.sheet || state.modal || keys ? 0.985 : 1 }}
        transition={SPRING_SOFT}
        {...(blocked ? { inert: '' as const } : {})}
      >
        <header className="flex shrink-0 items-center gap-2 px-5 pt-[calc(var(--sat)+0.75rem)]">
          <IconButton chrome label={spTable.header.back} onClick={() => spGo('')}>
            {Icon.back}
          </IconButton>
          <span className="disp text-20 font-bold tracking-[-0.02em]">
            {spTable.game} · {spTable.atTable}
          </span>
          <span className="ml-auto flex gap-1">
            <IconButton chrome label={d.keysButton} onClick={() => setKeys(true)}>
              {Icon.keyboard}
            </IconButton>
            {state.game && (
              <IconButton
                chrome
                label={spTable.header.board}
                onClick={() => actions.openSheet({ type: 'board' })}
              >
                {Icon.scores}
              </IconButton>
            )}
          </span>
        </header>
        <div
          className={`grid min-h-0 flex-1 ${playing ? 'tl:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]' : ''}`}
        >
          <main className="relative mx-auto h-full w-full max-w-[44rem]">
            <AnimatePresence custom={state.dir} initial={false} mode="popLayout">
              <m.div
                key={key}
                custom={state.dir}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: EASE }}
                className="absolute inset-0"
              >
                {content}
              </m.div>
            </AnimatePresence>
          </main>
          {playing && <ScorePanel />}
        </div>
      </m.div>
      <Overlays />
      <AnimatePresence>
        {keys && (
          <KeysModal
            key="keys"
            title={d.keys.title}
            list={d.keys.list}
            onClose={() => setKeys(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
