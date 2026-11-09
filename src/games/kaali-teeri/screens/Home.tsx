import { m } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { curHand } from '@/games/kaali-teeri/state/select';
import { doneHands, standings, type KtGame } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import type { KtHubPage } from '@/games/kaali-teeri/state/types';
import { ktMessages } from '@/games/kaali-teeri/strings/messages';
import { ktShell as s } from '@/games/kaali-teeri/strings/shell';
import { archive } from '@/state/archive';
import { useArchive } from '@/state/useArchive';
import { agoTxt } from '@/lib/format';
import { dayLabel } from '@/lib/dates';
import { Dot } from '@/components/ui/Dot';
import { Glass } from '@/components/ui/Glass';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PRESS } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';

const ROOT =
  'absolute inset-0 flex flex-col pt-[var(--sat)] pl-[max(var(--sal),calc((100%-40rem)/2))] pr-[max(var(--sar),calc((100%-40rem)/2))]';

/** "Hand 4 · Riya bid 180", or who deals while the hand has no bid yet. */
function handLine(g: KtGame): string {
  const h = curHand(g),
    p = ktMessages.peek;
  const bidder = g.players.find((x) => x.id === h.bidder);
  const what =
    bidder && h.bid != null ? p.bid(bidder.name, h.bid) : p.deals(g.players[h.dealerIndex].name);
  return `${p.hand(h.index + 1)} · ${what}`;
}

function ResumeCard({ g }: { g: KtGame }) {
  const { actions } = useKt();
  const fin = g.status === 'finished',
    ld = standings(g)[0];
  return (
    <Glass glow onClick={actions.resume} className="w-full cursor-pointer p-5 text-left">
      <div className="text-13 font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
        {fin ? s.home.finished : s.home.resume}
      </div>
      <div className="disp mt-1 text-24 font-bold tracking-[-0.025em] @h-short:text-22">
        {fin ? s.home.won(ld.p.name, ld.t) : handLine(g)}
      </div>
      {fin ? (
        <div className="mt-1 text-16 text-[var(--tx2)]">{s.home.hands(doneHands(g).length)}</div>
      ) : (
        doneHands(g).length > 0 && (
          <div className="mt-1.5 flex items-center gap-2 text-16">
            <Dot p={ld.p} />
            <span>{s.home.leads(ld.p.name, ld.t)}</span>
          </div>
        )
      )}
      <div className="mt-2 text-13 text-[var(--tx2)]">{s.home.saved(agoTxt(g.updatedAt))}</div>
    </Glass>
  );
}

/** Past games from the archive: loading, unavailable, empty, or the newest five. */
function Recent({ current }: { current: string | null }) {
  const { actions } = useKt();
  const [failed, setFailed] = useState(false);
  useEffect(() => archive.onError((e) => e === 'unavailable' && setFailed(true)), []);
  const { loaded, recs } = useArchive((a) => ({ loaded: a.loaded, recs: a.ktGames() }));
  const list = recs.filter((r) => r.syncId !== current).slice(0, 5);
  let body: ReactNode;
  if (failed) body = <p className="px-4 py-3 text-14 text-[var(--tx2)]">{s.home.unavailable}</p>;
  else if (!loaded)
    body = (
      <p role="status" className="px-4 py-3 text-14 text-[var(--tx2)]">
        {s.home.loading}
      </p>
    );
  else if (!list.length)
    body = <p className="px-4 py-3 text-14 text-[var(--tx2)]">{s.home.empty}</p>;
  else
    body = (
      <ul>
        {list.map((r, k) => {
          const g = r.game,
            top = standings(g)[0];
          return (
            <li key={r.syncId} className="relative">
              {k > 0 && (
                <span aria-hidden className="absolute left-4 right-0 top-0 h-px bg-ov/10" />
              )}
              <button
                type="button"
                onClick={() => actions.openPage({ page: 'game', id: r.syncId })}
                className="press flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-16 font-medium">{dayLabel(r.endedAt ?? r.updatedAt)}</div>
                  <div className="text-13 text-[var(--tx2)]">
                    {s.home.gameLine(g.players.length, doneHands(g).length)}
                    {r.endedAt == null && ` · ${s.home.inProgress}`}
                  </div>
                </div>
                {top && (
                  <div className="flex shrink-0 items-center gap-2 text-14 font-semibold">
                    <Dot p={top.p} />
                    {s.home.winner(top.p.name, top.t)}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    );
  return (
    <section aria-labelledby="kt-recent" className="w-full">
      <h2 id="kt-recent" className="mono-label mb-1.5 px-1 text-12 text-[var(--tx2)]">
        {s.home.recent}
      </h2>
      <div className="glass overflow-hidden">{body}</div>
    </section>
  );
}

/** Kaali Teeri's home: the wordmark, the game to resume, the hub links, recent games and New Game. */
export default function Home() {
  const { state, actions } = useKt();
  const g = state.game;
  const links: { key: KtHubPage | 'rules'; icon: ReactNode; go: () => void }[] = [
    { key: 'history', icon: Icon.history, go: () => actions.openPage({ page: 'history' }) },
    {
      key: 'leaderboard',
      icon: Icon.trophy,
      go: () => actions.openPage({ page: 'leaderboard' }),
    },
    { key: 'stats', icon: Icon.players, go: () => actions.openPage({ page: 'players' }) },
    { key: 'rules', icon: Icon.rules, go: () => actions.openSheet({ type: 'rules' }) },
  ];
  return (
    <div className={ROOT}>
      <IconButton
        chrome
        label={s.menu}
        onClick={() => actions.openSheet({ type: 'menu' })}
        className="!absolute left-[max(1rem,var(--sal))] top-[calc(var(--sat)+0.75rem)] z-10"
      >
        {Icon.menu}
      </IconButton>
      <div
        tabIndex={0}
        role="region"
        aria-label={s.name}
        className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-5"
      >
        <div className="mx-auto flex w-full max-w-[26rem] flex-col items-center gap-5 pb-4 pt-16">
          <m.div {...stagger(0)} className="flex flex-col items-center text-center">
            <h1 className="disp gold-text wordmark text-52 font-extrabold leading-none tracking-[-0.05em] @h-short:text-40">
              {s.name}
            </h1>
            <p className="mt-2 text-16 tracking-[0.02em] text-[var(--tx2)]">{s.tagline}</p>
          </m.div>
          {g && (
            <m.div {...stagger(1, 0.1)} className="w-full">
              <ResumeCard g={g} />
            </m.div>
          )}
          <m.nav
            {...stagger(2, 0.15)}
            aria-label={s.home.nav}
            className="glass w-full overflow-hidden"
          >
            {links.map((d, k) => (
              <m.button
                key={d.key}
                type="button"
                whileTap={PRESS}
                onClick={d.go}
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
                <span className="flex-1">{s.hub[d.key]}</span>
                <span aria-hidden className="text-[var(--dis)]">
                  {Icon.chev}
                </span>
              </m.button>
            ))}
          </m.nav>
          <m.div {...stagger(3, 0.2)} className="w-full">
            <Recent current={g?.syncId ?? null} />
          </m.div>
        </div>
      </div>
      <div className="chrome-bot flex min-h-[96px] items-center px-5 pb-[max(18px,var(--sab))] pt-[18px]">
        <PrimaryButton className="mx-auto w-full max-w-[26rem]" onClick={actions.startSetup}>
          {s.home.newGame}
        </PrimaryButton>
      </div>
    </div>
  );
}
