import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { curRound } from '@/domain';
import { useApp } from '@/state/store';
import { Icon } from '@/components/ui/Icons';
import { SPRING } from '@/components/ui/motion';
import { GhostButton, Kbd } from './DeskParts';
import { DESTS, destRoute, type Dest } from '@/components/hubNav';
import type { RouteName } from '@/state/types';
import { t } from '@/strings';

type Where = 'home' | 'game' | 'scores' | 'rules' | 'rounds' | `dest:${RouteName}`;

/** What the rail and the top bar can do, and which item is current; both read the same model. */
function useNav(onKeys: () => void) {
  const { state, actions } = useApp();
  const { screen, sheet, game } = state;
  const inGame = screen === 'round' || screen === 'winner';
  const top = state.nav.at(-1);
  const where: Where =
    sheet?.type === 'board' || sheet?.type === 'edit'
      ? 'scores'
      : top && sheet?.type !== 'rules' && sheet?.type !== 'upcoming'
        ? (`dest:${state.nav[0].screen}` as const)
        : sheet?.type === 'rules'
          ? 'rules'
          : sheet?.type === 'upcoming'
            ? 'rounds'
            : screen === 'home'
              ? 'home'
              : 'game';
  return {
    where,
    inGame,
    screen,
    canUndo: inGame && state.undo.length > 0,
    home: () => {
      if (sheet) actions.openSheet(null);
      if (screen !== 'home') actions.go('home', -1);
      else if (top) actions.navReset();
    },
    game: () => {
      if (sheet) actions.openSheet(null);
      if (screen === 'home') actions.resume();
      else if (top) actions.navReset();
    },
    dest: (d: Dest) => {
      if (sheet) actions.openSheet(null);
      actions.navReset([destRoute(d)]);
    },
    scores: () => actions.openSheet({ type: 'board' }),
    rules: () => actions.openSheet({ type: 'rules' }),
    rounds: () => actions.openSheet({ type: 'upcoming' }),
    undo: () => actions.undo(),
    menu: () => actions.openSheet({ type: 'menu' }),
    top,
    keys: onKeys,
    hasRounds: game.rounds.length > 0 && screen !== 'setup',
  };
}

interface RailItemProps {
  icon: ReactNode;
  label: string;
  on?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function RailItem({ icon, label, on, disabled, onClick }: RailItemProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={on ? 'page' : undefined}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={SPRING}
      className={`group relative isolate flex min-h-[3.75rem] w-[68px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl pb-2 pt-2.5 text-13 [@media(max-height:900px)]:min-h-[3.125rem] [@media(max-height:900px)]:gap-0.5 [@media(max-height:900px)]:py-1 font-bold disabled:cursor-default disabled:opacity-35 ${on ? 'text-[var(--tx)]' : 'text-[var(--tx2)]'}`}
    >
      {on && (
        <motion.span
          layoutId="rail-on"
          transition={SPRING}
          aria-hidden
          className="absolute inset-0 -z-10 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_40%,transparent)]"
        />
      )}
      <span
        aria-hidden
        className="absolute inset-0 -z-20 rounded-2xl bg-white/[.06] opacity-0 transition-opacity duration-200 [@media(hover:hover)]:group-enabled:group-hover:opacity-100"
      />
      <span className={on ? 'text-[var(--accent)]' : ''}>{icon}</span>
      {label}
    </motion.button>
  );
}

/** The side rail from tablet-on-its-side width up. */
export function Rail({ onKeys }: { onKeys: () => void }) {
  const n = useNav(onKeys);
  return (
    <nav
      aria-label={t.desk.nav.label}
      className="scroll-thin relative z-[2] hidden w-[88px] shrink-0 flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden border-r border-white/10 bg-felt-950/55 pb-6 pt-[calc(1.5rem+var(--sat))] pl-[var(--sal)] [backdrop-filter:blur(16px)] rail:flex"
    >
      <motion.button
        type="button"
        onClick={n.home}
        aria-label={t.desk.nav.home}
        whileTap={{ scale: 0.92 }}
        className="disp mb-5 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-gradient [@media(max-height:900px)]:mb-2 text-26 font-extrabold text-ink-gold shadow-[0_0_28px_rgba(247,231,166,.35)]"
      >
        <span aria-hidden>{t.desk.logo}</span>
      </motion.button>
      <RailItem icon={Icon.home} label={t.desk.nav.home} on={n.where === 'home'} onClick={n.home} />
      <RailItem
        icon={Icon.cards}
        label={t.desk.nav.game}
        on={n.where === 'game'}
        onClick={n.game}
      />
      <RailItem
        icon={Icon.scores}
        label={t.desk.nav.scores}
        on={n.where === 'scores'}
        disabled={!n.hasRounds}
        onClick={n.scores}
      />
      <RailItem
        icon={Icon.rules}
        label={t.desk.nav.rules}
        on={n.where === 'rules'}
        onClick={n.rules}
      />
      <RailItem
        icon={Icon.rounds}
        label={t.desk.nav.rounds}
        on={n.where === 'rounds'}
        disabled={!n.inGame}
        onClick={n.rounds}
      />
      <div aria-hidden className="my-1 h-px w-10 shrink-0 bg-white/10" />
      {DESTS.map((d) => (
        <RailItem
          key={d.screen}
          icon={d.icon}
          label={d.label}
          on={n.where === `dest:${d.screen}`}
          onClick={() => n.dest(d)}
        />
      ))}
      <div className="flex-1" />
      <RailItem icon={Icon.undo} label={t.desk.nav.undo} disabled={!n.canUndo} onClick={n.undo} />
      <RailItem icon={Icon.menu} label={t.desk.nav.menu} onClick={n.menu} />
      <div className="hidden kbd:block">
        <RailItem icon={Icon.keyboard} label={t.desk.nav.keys} onClick={n.keys} />
      </div>
    </nav>
  );
}

/** The top bar on a tablet held upright: the screen's name and the same tools as the rail. */
export function TopBar({ onKeys }: { onKeys: () => void }) {
  const { state } = useApp();
  const n = useNav(onKeys);
  const g = state.game,
    r = curRound(g);
  const title =
    n.top && n.where.startsWith('dest:')
      ? (DESTS.find((d) => `dest:${d.screen}` === n.where)?.label ?? t.appName)
      : n.where === 'scores'
        ? t.desk.nav.scoreboard
        : state.screen === 'home'
          ? t.appName
          : state.screen === 'setup'
            ? t.desk.setup.eyebrow
            : state.screen === 'winner'
              ? t.winner.finalScores
              : g.ui.view === 'summary'
                ? t.summary.title(r.index + 1)
                : t.desk.roundShort(r.index + 1, r.cards, r.trump);
  return (
    <header className="relative z-[2] mx-6 mt-[calc(1.25rem+var(--sat))] hidden h-[60px] shrink-0 items-center gap-3 pl-2 pr-3 tp:flex glass">
      <motion.button
        type="button"
        onClick={n.home}
        aria-label={t.desk.nav.home}
        whileTap={{ scale: 0.92 }}
        className="disp grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-gold-gradient text-22 font-extrabold text-ink-gold"
      >
        <span aria-hidden>{t.desk.logo}</span>
      </motion.button>
      <div className="disp min-w-0 flex-1 text-22 font-extrabold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">
        {title}
      </div>
      {n.hasRounds && n.where !== 'scores' && (
        <GhostButton onClick={n.scores}>{t.desk.nav.scores}</GhostButton>
      )}
      {n.where === 'scores' && <GhostButton onClick={n.game}>{t.desk.board.back}</GhostButton>}
      <GhostButton onClick={n.rules}>{t.desk.nav.rules}</GhostButton>
      {n.inGame && (
        <GhostButton icon aria-label={t.desk.nav.undo} disabled={!n.canUndo} onClick={n.undo}>
          {Icon.undo}
        </GhostButton>
      )}
      <GhostButton icon aria-label={t.desk.nav.menu} onClick={n.menu}>
        {Icon.menu}
      </GhostButton>
      <GhostButton
        icon
        aria-label={t.desk.keys.open}
        onClick={n.keys}
        className="hidden kbd:inline-flex"
      >
        <Kbd className="!inline-grid bg-transparent">?</Kbd>
      </GhostButton>
    </header>
  );
}
