import type { ReactElement } from 'react';
import { m } from 'framer-motion';
import { useApp } from '@/state/store';
import { stagger } from '@/components/ui/stagger';
import { destRoute, destsFor } from '@/components/hubNav';
import { t } from '@/strings';
import { loadThemeState } from '@/state/persistence';
import { Icon } from '@/components/ui/Icons';

type Row = [ReactElement, string, () => void, boolean?];

export function MenuBody() {
  const { state, actions } = useApp();
  const inGame = state.screen === 'round' || state.screen === 'winner';
  const go: Row[] = [
    ...destsFor(!!state.session).map((d): Row => [
      d.icon,
      d.label,
      () => actions.open(destRoute(d)),
    ]),
    state.session
      ? [Icon.user, t.hub.nav.account, () => actions.open({ screen: 'account' })]
      : [Icon.key, t.hub.nav.signIn, () => actions.open({ screen: 'signin' })],
  ];
  const game: Row[] = [
    [Icon.rules, t.sheets.menu.rules, () => actions.openSheet({ type: 'rules' })],
    [Icon.scores, t.sheets.menu.board, () => actions.openSheet({ type: 'board' })],
    [Icon.rounds, t.sheets.menu.upcoming, () => actions.openSheet({ type: 'upcoming' })],
    [Icon.undo, t.sheets.menu.undo, () => actions.undo()],
    ...(state.session
      ? [[Icon.link, t.hub.share.links, () => actions.openSheet({ type: 'share' })] as Row]
      : []),
    [
      Icon.flag,
      t.sheets.menu.end,
      () => {
        actions.openSheet(null);
        actions.ask('endGame');
      },
      true,
    ],
    [
      Icon.home,
      t.sheets.menu.quit,
      () => {
        actions.openSheet(null);
        actions.go('home', -1);
      },
    ],
  ];
  // Players pick their own theme only while the admin allows it.
  const own: Row[] = loadThemeState().appearance?.allowUserOverride
    ? [[Icon.palette, t.theme.menu, () => actions.openSheet({ type: 'theme' })]]
    : [];
  const items = inGame ? [...game, ...go, ...own] : [...go, ...own];
  return (
    <>
      {items.map(([ic, t, f, neg], i) => (
        <m.button
          key={t}
          type="button"
          {...stagger(i)}
          whileTap="press"
          variants={{ press: { scale: 0.97 } }}
          onClick={f}
          className={`relative isolate flex min-h-14 w-full items-center gap-3.5 rounded-2xl px-2 text-left text-18 font-medium tracking-[-0.012em] ${neg ? 'text-[var(--neg)]' : ''}`}
        >
          <m.span
            aria-hidden
            initial={false}
            variants={{ press: { opacity: 1 } }}
            style={{ opacity: 0 }}
            className="absolute inset-0 -z-10 rounded-[inherit] bg-ov/[.07]"
          />
          <span aria-hidden className="grid w-7 place-items-center">
            {ic}
          </span>
          {t}
        </m.button>
      ))}
    </>
  );
}
