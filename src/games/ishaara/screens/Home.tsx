import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import { useIshaara } from '@/games/ishaara/state/store';
import { useIshaaraHistory, useRefreshWhileVisible } from '@/games/ishaara/state/lists';
import type { IshaaraSummaryOut } from '@/games/ishaara/sync/types';
import { table as s } from '@/games/ishaara/strings/table';
import { go } from '@/platform/route';
import { Icon } from '@/components/ui/Icons';
import { icon } from '@/components/ui/IconsMore';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PRESS } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { SeatInviteCards } from '@/components/seat-invites/InviteCard';
import { ishaaraSeatTeam } from '@/games/ishaara/state/setUpAgain';
import { Mark } from './board/marks';

const h = s.home;
// One column on phones and upright tablets; side by side on a wide screen (ISH-F20), the wordmark beside the lists.
const ROOT =
  'absolute inset-0 flex flex-col pt-[var(--sat)] pl-[max(var(--sal),calc((100%-40rem)/2))] pr-[max(var(--sar),calc((100%-40rem)/2))] wide:pl-[max(var(--sal),calc((100%-64rem)/2))] wide:pr-[max(var(--sar),calc((100%-64rem)/2))]';

export type HubLink = 'clues' | 'history' | 'leaderboard' | 'awards' | 'activity' | 'rules';

const rowText = (g: IshaaraSummaryOut) => (
  <span className="min-w-0 flex-1">
    <span className="block text-16 font-semibold">
      {g.players
        .filter((p) => p.role === 'clue-giver')
        .map((p) => p.name)
        .join(' · ')}
    </span>
    <span className="flex items-center gap-1.5 text-14 text-[var(--tx2)]">
      {g.myTeam && <Mark id={g.myTeam} className="h-3 w-3" />}
      {g.myTeam
        ? g.isHost
          ? h.hostAndClues(g.myTeam)
          : h.yourClues(g.myTeam)
        : !g.isHost
          ? h.watching(g.host.name)
          : g.status === 'waiting'
            ? h.waiting
            : h.playing(g.wordsLeft.sun, g.wordsLeft.moon)}
    </span>
  </span>
);

/**
 * One game in progress. A host who also gives clues gets both the board and their key, so the table device can
 * always get back to the board (ISH-F01); anyone else opens the one view that is theirs.
 */
function GameRow({ g }: { g: IshaaraSummaryOut }) {
  const { actions } = useIshaara();
  if (g.isHost && g.myTeam)
    return (
      <div className="flex flex-col gap-2 px-4 py-2.5">
        {rowText(g)}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => actions.openGame(g.id, 'table')}
            className="press mat-fill-s min-h-11 flex-1 rounded-xl px-3 text-15 font-bold"
          >
            {h.openBoard}
          </button>
          <button
            type="button"
            onClick={() => actions.openGame(g.id, 'clue')}
            className="press mat-fill-s min-h-11 flex-1 rounded-xl px-3 text-15 font-bold"
          >
            {h.openKey}
          </button>
        </div>
      </div>
    );
  return (
    <button
      type="button"
      onClick={() => actions.openGame(g.id, g.myTeam ? 'clue' : 'table')}
      className="press flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left"
    >
      {rowText(g)}
      <span aria-hidden className="text-[var(--dis)]">
        {Icon.chev}
      </span>
    </button>
  );
}

/** Games this account is in that haven't finished: the table, the key, or both for a host who gives clues. */
function InProgress() {
  const list = useIshaaraHistory('active');
  // A game started on another device, or a clue-giver's game made at the table, shows up without a reload.
  useRefreshWhileVisible(list.reload);
  let body: ReactNode;
  if (list.loading && !list.items.length)
    body = (
      <p role="status" className="px-4 py-3 text-15 text-[var(--tx2)]">
        {h.loading}
      </p>
    );
  else if (list.error && !list.items.length)
    body = (
      <div className="flex items-center gap-3 px-4 py-3">
        <p className="flex-1 text-15 text-[var(--tx2)]">{h.loadFailed}</p>
        <button
          type="button"
          onClick={list.reload}
          className="press min-h-11 rounded-xl px-3 text-15 font-bold text-[var(--accent-tx)]"
        >
          {h.retry}
        </button>
      </div>
    );
  // Nothing in progress is the usual case, so it takes no room.
  else if (!list.items.length) return null;
  else
    body = (
      <ul>
        {list.items.map((g, k) => (
          <li key={g.id} className="relative">
            {k > 0 && <span aria-hidden className="absolute left-4 right-0 top-0 h-px bg-ov/10" />}
            <GameRow g={g} />
          </li>
        ))}
      </ul>
    );
  return (
    <section aria-labelledby="ish-live" className="w-full">
      <h2 id="ish-live" className="mono-label mb-1.5 px-1 text-13 text-[var(--tx2)]">
        {h.inProgress}
      </h2>
      <div className="glass overflow-hidden">{body}</div>
    </section>
  );
}

/** Ishaara's hub: the wordmark, games in progress, the hub links and New game. */
export default function Home({ onOpen }: { onOpen: (l: HubLink) => void }) {
  const { actions } = useIshaara();
  const links: { key: HubLink; label: string; icon: ReactNode }[] = [
    { key: 'clues', label: h.clueGames, icon: Icon.key },
    { key: 'history', label: h.history, icon: Icon.history },
    { key: 'leaderboard', label: h.leaderboard, icon: Icon.trophy },
    { key: 'awards', label: h.awards, icon: icon('medal') },
    { key: 'activity', label: h.activity, icon: icon('news') },
    { key: 'rules', label: h.rules, icon: Icon.rules },
  ];
  return (
    <div className={ROOT}>
      <div
        tabIndex={0}
        role="region"
        aria-label={h.name}
        className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-5"
      >
        <div className="mx-auto flex w-full max-w-[26rem] flex-col items-center gap-5 pb-4 pt-12 wide:grid wide:min-h-full wide:max-w-none wide:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] wide:content-center wide:items-center wide:gap-x-14 wide:pt-6">
          <m.div
            {...stagger(0)}
            className="flex flex-col items-center text-center wide:row-span-4 wide:items-start wide:text-left"
          >
            <span aria-hidden className="mb-3 flex gap-2 text-28">
              <span className="text-team-sun">
                <Mark id="sun" />
              </span>
              <span className="text-team-moon">
                <Mark id="moon" />
              </span>
            </span>
            <h1 className="disp text-52 font-extrabold leading-none tracking-[-0.05em] @h-short:text-40 wide:text-72">
              {h.name}
            </h1>
            <p className="mt-2 text-16 tracking-[0.02em] text-[var(--tx2)] wide:text-20">
              {h.tagline}
            </p>
          </m.div>
          <m.div {...stagger(1, 0.05)} className="w-full empty:hidden">
            <SeatInviteCards
              game="ishaara"
              seatLabel={(inv) => {
                const t = ishaaraSeatTeam(inv.seat);
                return t ? h.inviteSeat(t) : undefined;
              }}
            />
          </m.div>
          <m.div {...stagger(1, 0.1)} className="w-full">
            <InProgress />
          </m.div>
          <m.nav {...stagger(2, 0.15)} aria-label={h.nav} className="glass w-full overflow-hidden">
            {links.map((d, k) => (
              <m.button
                key={d.key}
                type="button"
                whileTap={PRESS}
                onClick={() => onOpen(d.key)}
                className="relative flex min-h-12 w-full items-center gap-3.5 px-4 text-left text-16 font-medium"
              >
                {k > 0 && (
                  <span aria-hidden className="absolute left-12 right-0 top-0 h-px bg-ov/10" />
                )}
                <span
                  aria-hidden
                  className="grid h-5 w-5 place-items-center text-[var(--tx2)] [&_svg]:h-5 [&_svg]:w-5"
                >
                  {d.icon}
                </span>
                <span className="flex-1">{d.label}</span>
                <span aria-hidden className="text-[var(--dis)]">
                  {Icon.chev}
                </span>
              </m.button>
            ))}
          </m.nav>
          <m.div {...stagger(3, 0.2)}>
            <button
              type="button"
              onClick={() => go(null)}
              className="press min-h-11 rounded-xl px-3 text-16 font-semibold text-[var(--tx2)] underline"
            >
              {h.allGames}
            </button>
          </m.div>
        </div>
      </div>
      <div className="chrome-bot flex min-h-[96px] items-center px-5 pb-[max(18px,var(--sab))] pt-[18px]">
        <PrimaryButton className="mx-auto w-full max-w-[26rem]" onClick={() => actions.go('setup')}>
          {h.newGame}
        </PrimaryButton>
      </div>
    </div>
  );
}
