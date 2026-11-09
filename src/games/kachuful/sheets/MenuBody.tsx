import type { ReactElement } from 'react';
import { m } from 'framer-motion';
import { useApp } from '@/games/kachuful/state/store';
import { MenuButton, MenuRow } from '@/components/ui/MenuRows';
import { stagger } from '@/components/ui/stagger';
import { destRoute, destsFor } from '@/games/kachuful/components/hubNav';
import { t } from '@/strings';
import { loadThemeState } from '@/state/persistence';
import { Icon } from '@/components/ui/Icons';
import { BaithakMark } from '@/components/ui/BaithakMark';
import { go } from '@/platform/route';
import { platform } from '@/strings/platform';

type Row = [ReactElement, string, () => void, boolean?];

/** The menu in three groups, as the reference draws it: this game, the app, the account; leaving sits at the foot. */
export function MenuBody() {
  const { state, actions } = useApp();
  const inGame = state.screen === 'round' || state.screen === 'winner';
  const app: Row[] = destsFor(!!state.session).map((d): Row => [
    d.icon,
    d.label,
    () => actions.open(destRoute(d)),
  ]);
  app.push([Icon.heart, t.hub.nav.credits, () => actions.open({ screen: 'credits' })]);
  const account: Row[] = [
    state.session
      ? [Icon.user, t.hub.nav.account, () => actions.open({ screen: 'account' })]
      : [Icon.key, t.hub.nav.signIn, () => actions.open({ screen: 'signin' })],
    // Players pick their own theme only while the admin allows it.
    ...(loadThemeState().appearance?.allowUserOverride
      ? [[Icon.palette, t.theme.menu, () => actions.openSheet({ type: 'theme' })] as Row]
      : []),
  ];
  const game: Row[] = [
    [Icon.scores, t.sheets.menu.board, () => actions.openSheet({ type: 'board' })],
    [Icon.rounds, t.sheets.menu.upcoming, () => actions.openSheet({ type: 'upcoming' })],
    [Icon.rules, t.sheets.menu.rules, () => actions.openSheet({ type: 'rules' })],
    [Icon.undo, t.sheets.menu.undo, () => actions.undo()],
    ...(state.session
      ? [[Icon.link, t.hub.share.links, () => actions.openSheet({ type: 'share' })] as Row]
      : []),
  ];
  const groups: [string, Row[]][] = [
    ...(inGame ? [[t.sheets.menu.sectionGame, game] as [string, Row[]]] : []),
    [t.sheets.menu.sectionApp, app],
    [t.sheets.menu.sectionAccount, account],
  ];
  let i = 0;
  return (
    <>
      <m.button
        type="button"
        {...stagger(i++)}
        whileTap={{ scale: 0.97 }}
        // The game is saved on every change, so leaving mid-round loses nothing.
        onClick={() => go(null)}
        className="glass mb-3 flex min-h-16 w-full items-center gap-3 p-3 text-left"
      >
        <BaithakMark className="h-10 w-10 shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-18 font-bold">{platform.allGames}</span>
          <span className="text-14 text-[var(--tx2)]">{platform.allGamesHint}</span>
        </span>
        <span aria-hidden className="text-[var(--tx2)]">
          {Icon.chev}
        </span>
      </m.button>
      {groups.map(([title, rows]) => (
        <section key={title} aria-label={title} className="mb-3">
          <h3 className="mono-label px-2 pb-1 text-12 text-[var(--tx2)]">{title}</h3>
          {rows.map(([ic, label, f], k) => (
            <MenuRow key={label} i={i++} icon={ic} label={label} onClick={f} rule={k > 0} />
          ))}
        </section>
      ))}
      {inGame && (
        <m.div {...stagger(i)} className="mt-1 grid grid-cols-2 gap-2">
          <MenuButton
            icon={Icon.home}
            label={t.sheets.menu.quit}
            onClick={() => {
              actions.openSheet(null);
              actions.go('home', -1);
            }}
          />
          <MenuButton
            neg
            icon={Icon.flag}
            label={t.sheets.menu.end}
            onClick={() => {
              actions.openSheet(null);
              actions.ask('endGame');
            }}
          />
        </m.div>
      )}
    </>
  );
}
