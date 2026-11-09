import type { ReactElement } from 'react';
import { m } from 'framer-motion';
import { doneHands } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { end } from '@/games/kaali-teeri/strings/end';
import { loadThemeState } from '@/state/persistence';
import { Icon } from '@/components/ui/Icons';
import { MenuButton, MenuRow } from '@/components/ui/MenuRows';
import { stagger } from '@/components/ui/stagger';
import { go } from '@/platform/route';

/** Leaves Kaali Teeri for the game picker, without a reload; the game is saved on every change. */
const toAllGames = () => go(null);

type Row = [ReactElement, string, () => void];

/** The menu in two groups, as Kachuful's: this game, then the app; leaving and ending sit at the foot. */
export default function Menu() {
  const { state, actions } = useKt();
  const g = state.game;
  const inGame = state.screen === 'game' && g?.status === 'active';
  const scored = !!g && doneHands(g).length > 0;
  const close = () => actions.openSheet(null);
  const game: Row[] = [
    [Icon.scores, end.menu.board, () => actions.openSheet({ type: 'board' })],
    [Icon.rules, end.menu.rules, () => actions.openSheet({ type: 'rules' })],
    ...(scored
      ? [[Icon.share, end.menu.share, () => actions.openSheet({ type: 'share' })] as Row]
      : []),
    [Icon.undo, end.menu.undo, () => actions.undo()],
  ];
  const app: Row[] = [
    ...(inGame
      ? []
      : [[Icon.rules, end.menu.rules, () => actions.openSheet({ type: 'rules' })] as Row]),
    [Icon.cards, end.menu.allGames, toAllGames],
    // Players pick their own theme only while the admin allows it.
    ...(loadThemeState().appearance?.allowUserOverride
      ? [[Icon.palette, end.menu.theme, () => actions.openSheet({ type: 'theme' })] as Row]
      : []),
  ];
  const groups: [string, Row[]][] = [
    ...(inGame ? [[end.menu.sectionGame, game] as [string, Row[]]] : []),
    [end.menu.sectionApp, app],
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
          label={end.menu.newGame}
          wide={!inGame}
          onClick={() => {
            close();
            actions.startSetup();
          }}
        />
        {inGame && (
          // With no hand scored there is no winner to crown, so the game can only be abandoned.
          <MenuButton
            icon={Icon.flag}
            label={end.menu.finish}
            disabled={!scored}
            onClick={() => {
              close();
              actions.ask('finish');
            }}
          />
        )}
        {inGame && (
          <MenuButton
            neg
            wide
            icon={Icon.trash}
            label={end.menu.abandon}
            onClick={() => {
              close();
              actions.ask('abandon');
            }}
          />
        )}
      </m.div>
    </>
  );
}
