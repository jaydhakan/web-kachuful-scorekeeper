import type { ReactElement } from 'react';
import { m } from 'framer-motion';
import { doneHands } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { end } from '@/games/kaali-teeri/strings/end';
import { loadThemeState } from '@/state/persistence';
import { Icon } from '@/components/ui/Icons';
import { stagger } from '@/components/ui/stagger';

/** Leaves Kaali Teeri for the game picker; the one place to change when the platform router lands. */
function toAllGames() {
  location.assign('/');
}

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
  wide,
  disabled,
}: {
  icon: ReactElement;
  label: string;
  onClick: () => void;
  neg?: boolean;
  wide?: boolean;
  disabled?: boolean;
}) {
  return (
    <m.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`mat-cta mat-sm relative isolate flex min-h-12 items-center justify-center gap-2 rounded-[18px] px-3 text-16 font-bold disabled:opacity-45 ${neg ? 'text-[var(--neg)]' : ''} ${wide ? 'col-span-2' : ''}`}
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
