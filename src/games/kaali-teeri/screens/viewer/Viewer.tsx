import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import {
  doneHands,
  result,
  standings,
  team,
  type KtGame,
  type KtHand,
} from '@/games/kaali-teeri/domain';
import { curHand } from '@/games/kaali-teeri/state/select';
import { online } from '@/games/kaali-teeri/strings/online';
import { fromWire } from '@/games/kaali-teeri/sync/engine';
import { ktEp } from '@/games/kaali-teeri/sync/endpoints';
import type { KtGameSummary, KtLiveResp } from '@/games/kaali-teeri/sync/types';
import { agoTxt } from '@/lib/format';
import { ApiError } from '@/sync/api';
import { followLive } from '@/sync/live';
import { Dot } from '@/components/ui/Dot';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RankMark } from '@/components/ui/RankMark';
import { SPRING } from '@/components/ui/motion';
import type { KtViewerLink } from './entry';

const v = online.viewer;
const QUIET_MS = 2 * 60e3;

type Failed = 'revoked' | 'missing' | 'offline' | 'members' | 'other';
type On = {
  k: 'on';
  game: KtGame;
  updatedAt: number | null;
  scorerSeenAt: number | null;
  recapToken: string | null;
};
type St = { k: 'loading' } | { k: Failed } | On;

/** 404 is an unknown link, 410 one turned off or expired, 401 a table kept to members. */
const refused = (e: unknown): St =>
  e instanceof ApiError && e.offline
    ? { k: 'offline' }
    : e instanceof ApiError && e.code === 'members_only'
      ? { k: 'members' }
      : { k: e instanceof ApiError && e.status === 410 ? 'revoked' : 'missing' };

/** A viewer may be signed out, so photos come with the public summary rather than from the registry. */
const withPhotos = (g: KtGame, sum: KtGameSummary): KtGame => ({
  ...g,
  players: g.players.map((p) => ({
    ...p,
    photoUrl: sum.players.find((x) => x.playerId === p.playerId)?.photoUrl ?? null,
  })),
});

/** Public bodies carry their game's kind: a Kachuful link opened here says so instead of misreading it. */
function onFrom(r: KtLiveResp | { kind: string }): St {
  if (r.kind !== 'kaali-teeri') return { k: 'other' };
  const b = r as KtLiveResp;
  return {
    k: 'on',
    game: withPhotos(fromWire(b.game), b.summary),
    updatedAt: b.updatedAt ?? null,
    scorerSeenAt: b.scorerSeenAt ?? null,
    recapToken: b.recapToken ?? null,
  };
}

const nameOf = (g: KtGame, id: string | null) => g.players.find((p) => p.id === id)?.name ?? '';

function Standings({ g }: { g: KtGame }) {
  const rm = useReducedMotion();
  return (
    <ol className="flex flex-col gap-2">
      {standings(g).map((s) => (
        <m.li
          key={s.p.id}
          layout={!rm}
          transition={SPRING}
          className="glass flex min-h-14 items-center gap-3 px-4"
        >
          <RankMark rank={s.rank} final={g.status === 'finished'} />
          <Dot p={s.p} s={36} />
          <span className="min-w-0 flex-1 text-17 font-bold [overflow-wrap:anywhere]">
            {s.p.name}
          </span>
          {/* Keyed on the total, so a changed score fades in (opacity only). */}
          <m.span
            key={s.t}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            className="disp text-22 font-extrabold"
          >
            {s.t}
          </m.span>
        </m.li>
      ))}
    </ol>
  );
}

/** "Riya bid 180 with Meera · made it". */
function handLine(g: KtGame, h: KtHand): string {
  const mates = team(h)
    .slice(1)
    .map((id) => nameOf(g, id))
    .filter(Boolean);
  const res = h.phase === 'done' ? result(h, g.rules) : null;
  return [
    h.bidder && h.bid != null ? v.bid(nameOf(g, h.bidder), h.bid) : v.bidding,
    mates.length ? v.partners(mates.join(', ')) : '',
  ]
    .filter(Boolean)
    .join(' ')
    .concat(res ? ` · ${res.made ? v.made : v.missed}` : '');
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-13 font-bold uppercase tracking-[0.12em] text-[var(--tx2)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The public read-only view of a Kaali Teeri table: the standings and the hands, live (following the scorer's
 * uploads over SSE, as Kachuful's live page does) or as a recap. Nothing here can change the game.
 */
export default function Viewer({ link, onClose }: { link: KtViewerLink; onClose: () => void }) {
  const [st, setSt] = useState<St>({ k: 'loading' });
  const [watchers, setWatchers] = useState(0);
  const [, tick] = useState(0);
  // A finished live table hands off to its recap in place.
  const [cur, setCur] = useState(link);
  const { kind, token } = cur;

  useEffect(() => {
    let live = true;
    setSt({ k: 'loading' });
    const read = kind === 'live' ? ktEp.live : ktEp.recap;
    read(token).then(
      (r) => live && setSt(onFrom(r)),
      (e: unknown) => live && setSt(refused(e)),
    );
    if (kind === 'recap')
      return () => {
        live = false;
      };
    const stop = followLive(token, (e) => {
      if (!live) return;
      if (e.type === 'game') setSt(onFrom(e.data as unknown as KtLiveResp));
      else if (e.type === 'watchers') setWatchers(e.n);
      else if (e.type === 'revoked') setSt({ k: 'revoked' });
      // The stream was refused for good: the plain read says why.
      else if (e.type === 'closed')
        ktEp.live(token).then(
          () => live && setSt({ k: 'missing' }),
          (x: unknown) => live && setSt(refused(x)),
        );
    });
    const clock = setInterval(() => tick((n) => n + 1), 30e3);
    return () => {
      live = false;
      stop();
      clearInterval(clock);
    };
  }, [kind, token]);

  const open = (
    <PrimaryButton className="mt-8 w-full" onClick={onClose}>
      {v.open}
    </PrimaryButton>
  );
  let title: string = kind === 'live' ? v.live : v.recap;
  let eyebrow: string | null = null;
  let body: ReactNode;
  if (st.k === 'loading')
    body = (
      <div role="status" aria-label={kind === 'live' ? v.connecting : v.loading}>
        <p className="mb-3 text-15 text-[var(--tx2)]">
          {kind === 'live' ? v.connecting : v.loading}
        </p>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="mb-2 h-14 rounded-2xl bg-ov/[.06]" />
        ))}
      </div>
    );
  else if (st.k !== 'on') {
    const [head, sub] =
      st.k === 'members'
        ? [v.membersOnly, v.membersOnlyBody]
        : st.k === 'other'
          ? [v.otherGame, v.otherGameBody]
          : st.k === 'revoked'
            ? [kind === 'live' ? v.liveRevoked : v.recapRevoked, null]
            : st.k === 'offline'
              ? [v.offline, null]
              : [v.notFound, null];
    body = (
      <div role="alert" className="glass mt-4 p-6 text-center">
        <p className="text-18 font-bold">{head}</p>
        {sub && <p className="mt-2 text-15 text-[var(--tx2)]">{sub}</p>}
      </div>
    );
  } else {
    const g = st.game,
      over = g.status === 'finished',
      h = curHand(g),
      done = doneHands(g);
    if (kind === 'live') {
      if (over) title = v.over;
      // No scorer time yet: the last upload is the last sign of the scorer.
      const seen = st.scorerSeenAt ?? st.updatedAt;
      if (seen != null)
        eyebrow =
          !over && Date.now() - seen > QUIET_MS
            ? v.quiet(Math.round((Date.now() - seen) / 60e3))
            : v.updated(agoTxt(st.updatedAt ?? seen));
    }
    body = (
      <>
        {kind === 'live' && watchers > 0 && (
          <p className="text-14 font-bold text-[var(--tx2)]">{v.watching(watchers)}</p>
        )}
        {kind === 'live' && over && st.recapToken && (
          <PrimaryButton
            className="mt-4 w-full"
            onClick={() => setCur({ kind: 'recap', token: st.recapToken! })}
          >
            {v.seeRecap}
          </PrimaryButton>
        )}
        {kind === 'live' && !over && h.phase !== 'done' && (
          <div aria-live="polite" className="glass mt-4 p-4">
            <div className="disp text-20 font-extrabold">{v.hand(h.index + 1)}</div>
            <p className="mt-1 text-15 text-[var(--tx2)]">
              {v.deals(g.players[h.dealerIndex]?.name ?? '')} · {handLine(g, h)}
            </p>
          </div>
        )}
        <Section title={over ? v.final : v.standings}>
          <Standings g={g} />
        </Section>
        <Section title={v.hands}>
          {done.length ? (
            <ol className="flex flex-col gap-1.5">
              {[...done].reverse().map((d) => (
                <li key={d.index} className="glass px-4 py-3 text-15">
                  <span className="font-bold">{v.hand(d.index + 1)}</span>
                  <span className="text-[var(--tx2)]"> · {handLine(g, d)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-15 text-[var(--tx2)]">{v.noHands}</p>
          )}
        </Section>
      </>
    );
  }
  return (
    <div
      data-game="kaali-teeri"
      className="app-root scr-bg grain relative h-full w-full overflow-y-auto"
    >
      <main className="mx-auto w-full max-w-[40rem] px-4 pb-[calc(var(--sab)+2rem)] pt-[calc(var(--sat)+1.5rem)]">
        {eyebrow && <p className="text-13 font-bold text-[var(--accent)]">{eyebrow}</p>}
        <h1 className="disp text-30 font-extrabold tracking-[-0.025em]">{title}</h1>
        {body}
        {open}
      </main>
    </div>
  );
}
