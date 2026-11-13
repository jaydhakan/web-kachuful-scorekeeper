import { m } from 'framer-motion';
import { curHand } from '@/games/kaali-teeri/state/select';
import { useKt } from '@/games/kaali-teeri/state/store';
import { ktDesk as kd } from '@/games/kaali-teeri/strings/desk';
import { ktShell } from '@/games/kaali-teeri/strings/shell';
import { kp } from '@/games/kaali-teeri/strings/play';
import { GhostButton, Kbd } from '@/components/desk/DeskParts';
import { RailItem } from '@/components/desk/RailItem';
import { Icon } from '@/components/ui/Icons';
import { IconOn } from '@/components/ui/IconsFill';
import { PRESS_SM } from '@/components/ui/motion';
import { t } from '@/strings';

type Where = 'home' | 'game' | 'scores' | 'rules';

/** What the rail and the top bar can do, and which item is current; both read the same model. */
function useNav(onKeys: () => void) {
  const { state, actions } = useKt();
  const { screen, sheet, game } = state;
  const inGame = !!game && (screen === 'game' || screen === 'winner');
  const where: Where =
    sheet?.type === 'board' || sheet?.type === 'edit'
      ? 'scores'
      : sheet?.type === 'rules'
        ? 'rules'
        : screen === 'home'
          ? 'home'
          : 'game';
  const close = () => sheet && actions.openSheet(null);
  return {
    where,
    inGame,
    hasGame: !!game,
    canUndo: inGame && state.undo.length > 0,
    home: () => {
      close();
      if (screen !== 'home') actions.go('home', -1);
    },
    game: () => {
      close();
      if (screen === 'home' && game) actions.resume();
    },
    scores: () => actions.openSheet({ type: 'board' }),
    rules: () => actions.openSheet({ type: 'rules' }),
    undo: () => actions.undo(),
    menu: () => actions.openSheet({ type: 'menu' }),
    keys: onKeys,
  };
}

/** The side rail from tablet-on-its-side width up. */
export function KtRail({ onKeys }: { onKeys: () => void }) {
  const n = useNav(onKeys);
  return (
    <nav
      aria-label={kd.nav.label}
      className="scroll-thin relative z-[2] hidden w-[88px] shrink-0 flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden border-r border-ov/10 bg-felt-950/55 pb-6 pl-[var(--sal)] pt-[calc(1.5rem+var(--sat))] [backdrop-filter:blur(16px)] rail:flex"
    >
      <m.button
        type="button"
        onClick={n.home}
        aria-label={kd.nav.home}
        whileTap={PRESS_SM}
        className="disp mb-5 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-gradient text-18 font-extrabold text-ink-gold shadow-[0_0_28px_color-mix(in_srgb,var(--medal-gold-hi)_35%,transparent)] [@media(max-height:900px)]:mb-2"
      >
        <span aria-hidden>{kd.logo}</span>
      </m.button>
      <RailItem
        icon={Icon.home}
        iconOn={IconOn.home}
        label={kd.nav.home}
        on={n.where === 'home'}
        onClick={n.home}
      />
      <RailItem
        icon={Icon.cards}
        iconOn={IconOn.game}
        label={kd.nav.game}
        on={n.where === 'game'}
        disabled={!n.hasGame}
        onClick={n.game}
      />
      <RailItem
        icon={Icon.scores}
        iconOn={IconOn.scores}
        label={kd.nav.scores}
        on={n.where === 'scores'}
        disabled={!n.hasGame}
        onClick={n.scores}
      />
      <RailItem
        icon={Icon.rules}
        iconOn={IconOn.rules}
        label={kd.nav.rules}
        on={n.where === 'rules'}
        onClick={n.rules}
      />
      <div className="flex-1" />
      <RailItem icon={Icon.undo} label={kd.nav.undo} disabled={!n.canUndo} onClick={n.undo} />
      <RailItem icon={Icon.menu} label={kd.nav.menu} onClick={n.menu} />
      <div className="hidden kbd:block">
        <RailItem icon={Icon.keyboard} label={kd.nav.keys} onClick={n.keys} />
      </div>
    </nav>
  );
}

/** The top bar on a tablet held upright: the screen's name and the same tools as the rail. */
export function KtTopBar({ onKeys }: { onKeys: () => void }) {
  const { state } = useKt();
  const n = useNav(onKeys);
  const g = state.game;
  const h = g && curHand(g);
  const title =
    n.where === 'scores'
      ? ktShell.sheets.board
      : state.screen === 'setup'
        ? kd.nav.setup
        : state.screen === 'winner'
          ? t.winner.finalScores
          : state.screen === 'game' && g && h
            ? g.ui.view === 'summary' || h.phase === 'done'
              ? kp.summary.title(h.index + 1)
              : kd.eyebrow(h.index + 1, h.phase)
            : ktShell.name;
  return (
    <header className="glass relative z-[2] mx-6 mt-[calc(1.25rem+var(--sat))] hidden h-[60px] shrink-0 items-center gap-3 pl-2 pr-3 tp:flex">
      <m.button
        type="button"
        onClick={n.home}
        aria-label={kd.nav.home}
        whileTap={PRESS_SM}
        className="disp grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-gold-gradient text-16 font-extrabold text-ink-gold"
      >
        <span aria-hidden>{kd.logo}</span>
      </m.button>
      <div className="disp min-w-0 flex-1 text-22 font-extrabold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">
        {title}
      </div>
      {n.hasGame && <GhostButton onClick={n.scores}>{kd.nav.scores}</GhostButton>}
      <GhostButton onClick={n.rules}>{kd.nav.rules}</GhostButton>
      {n.inGame && (
        <GhostButton icon aria-label={kd.nav.undo} disabled={!n.canUndo} onClick={n.undo}>
          {Icon.undo}
        </GhostButton>
      )}
      <GhostButton icon aria-label={kd.nav.menu} onClick={n.menu}>
        {Icon.menu}
      </GhostButton>
      <GhostButton
        icon
        aria-label={kd.keys.open}
        onClick={n.keys}
        className="hidden kbd:inline-flex"
      >
        <Kbd className="!inline-grid bg-transparent">?</Kbd>
      </GhostButton>
    </header>
  );
}
