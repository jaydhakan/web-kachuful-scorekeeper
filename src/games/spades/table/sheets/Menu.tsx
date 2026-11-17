import type { ReactElement } from 'react';
import { m } from 'framer-motion';
import { spGo } from '@/games/spades/nav';
import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { hasDone } from '@/games/spades/table/state/select';
import { go } from '@/platform/route';
import { signedInAs, useSession } from '@/sync/session';
import { Icon } from '@/components/ui/Icons';
import { MenuButton, MenuRow } from '@/components/ui/MenuRows';
import { stagger } from '@/components/ui/stagger';

const s = spTable.menu;
type Row = [ReactElement, string, () => void];

/**
 * This game (Scoreboard, Rules, Share, Undo), then Spades (with Awards, and Activity signed in); at the foot New game and the three ways to stop a game,
 * each behind a confirmation (plan D14). End game and Call it a draw need a scored hand.
 */
export default function Menu() {
  const { state, actions } = useSp();
  const g = state.game;
  const inGame = state.screen === 'game' && g?.status === 'active';
  const scored = hasDone(g);
  const signedIn = !!signedInAs(useSession());
  const close = () => actions.openSheet(null);
  const ask = (k: 'end' | 'draw' | 'cancel') => {
    close();
    actions.ask(k);
  };
  const game: Row[] = [
    [Icon.scores, s.board, () => actions.openSheet({ type: 'board' })],
    [Icon.rules, s.rules, () => actions.openSheet({ type: 'rules' })],
    ...(scored ? [[Icon.share, s.share, () => actions.openSheet({ type: 'share' })] as Row] : []),
    [
      Icon.undo,
      s.undo,
      () => {
        close();
        actions.undo();
      },
    ],
  ];
  const app: Row[] = [
    ...(inGame ? [] : [[Icon.rules, s.rules, () => actions.openSheet({ type: 'rules' })] as Row]),
    [Icon.history, s.history, () => spGo('?keep&page=history')],
    [Icon.boards, s.leaderboard, () => spGo('?keep&page=leaderboard')],
    [Icon.awards, s.awards, () => spGo('?keep&page=awards')],
    ...(signedIn ? [[Icon.activity, s.activity, () => spGo('?keep&page=activity')] as Row] : []),
    [Icon.home, s.home, () => spGo('')],
    [Icon.cards, s.allGames, () => go(null)],
  ];
  const groups: [string, Row[]][] = [
    ...(g ? [[s.sectionGame, game] as [string, Row[]]] : []),
    [s.sectionApp, app],
  ];
  let i = 0;
  return (
    <>
      {groups.map(([title, rows]) => (
        <section key={title} aria-label={title} className="mb-3">
          <h3 className="mono-label px-2 pb-1 text-13 text-[var(--tx2)]">{title}</h3>
          {rows.map(([ic, label, f], k) => (
            <MenuRow key={label} i={i++} icon={ic} label={label} onClick={f} rule={k > 0} />
          ))}
        </section>
      ))}
      <m.div {...stagger(i)} className="mt-1 grid grid-cols-2 gap-2">
        <MenuButton
          icon={Icon.plus}
          label={s.newGame}
          wide={!inGame}
          onClick={() => {
            close();
            actions.startSetup();
          }}
        />
        {inGame && (
          <MenuButton
            icon={Icon.flag}
            label={s.end}
            disabled={!scored}
            onClick={() => ask('end')}
          />
        )}
        {inGame && (
          <MenuButton
            icon={Icon.check}
            label={s.draw}
            wide
            disabled={!scored}
            onClick={() => ask('draw')}
          />
        )}
        {inGame && (
          <MenuButton neg wide icon={Icon.trash} label={s.cancel} onClick={() => ask('cancel')} />
        )}
      </m.div>
    </>
  );
}
