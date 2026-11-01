import type { ReactElement } from 'react';
import { m } from 'framer-motion';
import { useApp } from '@/state/store';
import { stagger } from '@/components/ui/stagger';
import { destRoute, destsFor } from '@/components/hubNav';
import { t } from '@/strings';
import { loadThemeState } from '@/state/persistence';
import { Icon } from '@/components/ui/Icons';

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

function MenuRow({
  i,
  icon,
  label,
  onClick,
  rule,
}: {
  i: number;
  icon: ReactElement;
  label: string;
  onClick: () => void;
  rule: boolean;
}) {
  return (
    <m.button
      type="button"
      {...stagger(i)}
      whileTap="press"
      variants={{ press: { scale: 0.97 } }}
      onClick={onClick}
      className="relative isolate flex min-h-12 w-full items-center gap-3.5 rounded-2xl px-2 text-left text-17 font-medium tracking-[-0.012em]"
    >
      {/* Hairlines between rows, inset past the icon. */}
      {rule && <span aria-hidden className="absolute left-12 right-2 top-0 h-px bg-ov/10" />}
      <m.span
        aria-hidden
        initial={false}
        variants={{ press: { opacity: 1 } }}
        style={{ opacity: 0 }}
        className="absolute inset-0 -z-10 rounded-[inherit] bg-ov/[.07]"
      />
      <span aria-hidden className="grid w-7 place-items-center text-[var(--tx2)]">
        {icon}
      </span>
      {label}
    </m.button>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  neg,
}: {
  icon: ReactElement;
  label: string;
  onClick: () => void;
  neg?: boolean;
}) {
  return (
    <m.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`mat-cta mat-sm relative isolate flex min-h-12 items-center justify-center gap-2 rounded-[18px] px-3 text-16 font-bold ${neg ? 'text-[var(--neg)]' : ''}`}
    >
      <span
        aria-hidden
        className={`${neg ? 'mat-fill-d' : 'mat-fill-s'} absolute inset-0 -z-10 rounded-[inherit]`}
      />
      <span aria-hidden className="grid place-items-center">
        {icon}
      </span>
      {label}
    </m.button>
  );
}
