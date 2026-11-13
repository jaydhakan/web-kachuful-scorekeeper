import { m } from 'framer-motion';
import { curRound } from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { Icon } from '@/components/ui/Icons';
import { PRESS_SM } from '@/components/ui/motion';
import { GhostButton, Kbd } from './DeskParts';
import { RailItem } from '@/components/desk/RailItem';
import { DESTS, destRoute, destsFor, type Dest } from '@/games/kachuful/components/hubNav';
import { SyncDot } from '@/components/SyncDot';
import type { RouteName } from '@/games/kachuful/state/types';
import { t } from '@/strings';
import { platform } from '@/strings/platform';
import { go } from '@/platform/route';
import { BaithakMark } from '@/components/ui/BaithakMark';

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
    dest: (d: Pick<Dest, 'screen'>) => {
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

/** The side rail from tablet-on-its-side width up. */
export function Rail({ onKeys }: { onKeys: () => void }) {
  const n = useNav(onKeys);
  const { state } = useApp();
  return (
    <nav
      aria-label={t.desk.nav.label}
      className="scroll-thin relative z-[2] hidden w-[88px] shrink-0 flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden border-r border-ov/10 bg-felt-950/55 pb-6 pt-[calc(1.5rem+var(--sat))] pl-[var(--sal)] [backdrop-filter:blur(16px)] rail:flex"
    >
      {/* Baithak's mark leaves for the game picker; the game is saved on every change. */}
      <RailItem
        icon={<BaithakMark className="h-8 w-8" />}
        label={platform.allGames}
        onClick={() => go(null)}
      />
      <div
        aria-hidden
        className="mb-3 h-px w-10 shrink-0 bg-ov/10 [@media(max-height:900px)]:mb-1"
      />
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
      <div aria-hidden className="my-1 h-px w-10 shrink-0 bg-ov/10" />
      {destsFor(!!state.session).map((d) => (
        <span key={d.screen} data-dest={d.screen} className="contents">
          <RailItem
            icon={d.icon}
            label={d.label}
            on={n.where === `dest:${d.screen}`}
            onClick={() => n.dest(d)}
          />
        </span>
      ))}
      <div className="flex-1" />
      <RailItem
        icon={
          <span className="relative">
            {Icon.account}
            <SyncDot className="absolute -right-3 -top-2" />
          </span>
        }
        label={state.session ? t.hub.nav.account : t.hub.nav.signIn}
        on={n.where === 'dest:account' || n.where === 'dest:signin' || n.where === 'dest:admin'}
        onClick={() => n.dest({ screen: state.session ? 'account' : 'signin' })}
      />
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
      <m.button
        type="button"
        onClick={n.home}
        aria-label={t.desk.nav.home}
        whileTap={PRESS_SM}
        className="disp grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-gold-gradient text-22 font-extrabold text-ink-gold"
      >
        <span aria-hidden>{t.desk.logo}</span>
      </m.button>
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
