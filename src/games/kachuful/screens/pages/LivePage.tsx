import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  curRound,
  doneRounds,
  lastRoundMoments,
  standings,
  type Game,
  type Player,
} from '@/games/kachuful/domain';
import { agoTxt, fmt } from '@/lib/format';
import { archive } from '@/state/archive';
import { useApp } from '@/games/kachuful/state/store';
import { ApiError } from '@/sync/api';
import { fromWire } from '@/games/kachuful/sync/engine';
import { ep } from '@/sync/endpoints';
import { followLive } from '@/sync/live';
import type { GameSummary, LiveResp } from '@/sync/types';
import { EmptyState, Page, Section, Skeleton } from '@/components/ui/Page';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SuitGlyph } from '@/components/ui/SuitGlyph';
import { SPRING } from '@/components/ui/motion';
import { RankMark } from '@/components/ui/RankMark';
import { Avatar } from '@/components/ui/Avatar';
import { Dot } from '@/components/ui/Dot';
import {
  ReactionBar,
  ReactionBurst,
  useBursts,
  WatchersPill,
} from '@/games/kachuful/components/LiveReactions';
import { achName } from '@/games/kachuful/strings/achievements';
import { ACH } from '@/games/kachuful/domain';
import { gameLine } from './HistoryPage';
import { t } from '@/strings';

const lv = t.hub.live;
const QUIET_MS = 2 * 60e3;

type On = {
  k: 'on';
  game: Game;
  updatedAt: number;
  scorerSeenAt: number | null;
  reactions: boolean;
  recapToken: string | null;
};
type LiveState = { k: 'connecting' | 'revoked' | 'missing' | 'offline' | 'members' } | On;

/** 404 is an unknown link, 410 one turned off or expired, 401 a table kept to members. */
const refused = (e: unknown): LiveState =>
  e instanceof ApiError && e.offline
    ? { k: 'offline' }
    : e instanceof ApiError && e.code === 'members_only'
      ? { k: 'members' }
      : { k: e instanceof ApiError && e.status === 410 ? 'revoked' : 'missing' };

/** A viewer may be signed out, so photos come with the public summary rather than from a registry. */
export const withPhotos = (g: Game, sum: GameSummary): Game => ({
  ...g,
  players: g.players.map((p) => ({
    ...p,
    photoUrl: sum.players.find((x) => x.playerId === p.playerId)?.photoUrl ?? null,
  })),
});

const onFrom = (r: LiveResp): On => ({
  k: 'on',
  game: withPhotos(fromWire(r.game), r.summary),
  updatedAt: r.updatedAt,
  scorerSeenAt: r.scorerSeenAt,
  reactions: r.reactions ?? false,
  recapToken: r.recapToken ?? null,
});

function OpenApp() {
  const { actions } = useApp();
  return (
    <PrimaryButton className="mt-6 w-full" onClick={() => actions.navReset()}>
      {lv.open}
    </PrimaryButton>
  );
}

/** Standings that move as rounds land: changed totals pulse, rows slide to their new place. */
export function LiveStandings({
  g,
  big = false,
  aside,
}: {
  g: Game;
  big?: boolean;
  aside?: (p: Player) => React.ReactNode;
}) {
  const rm = useReducedMotion();
  const st = standings(g);
  return (
    <ol className="flex flex-col gap-2">
      {st.map((s) => (
        <m.li
          key={s.p.id}
          layout={!rm}
          transition={SPRING}
          className={`glass flex items-center gap-3 px-4 ${big ? 'min-h-20' : 'min-h-14'}`}
        >
          <RankMark rank={s.rank} final={g.status === 'finished'} />
          <Avatar
            p={s.p}
            className={`grid place-items-center rounded-full ${big ? 'h-14 w-14 text-32' : 'h-9 w-9 text-20'}`}
          />
          <span
            className={`min-w-0 flex-1 font-bold [overflow-wrap:anywhere] ${big ? 'text-30' : 'text-17'}`}
          >
            {s.p.name}
          </span>
          {aside?.(s.p)}
          <m.span
            key={s.t}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            className={`disp font-extrabold ${big ? 'text-36' : 'text-22'}`}
          >
            {fmt(s.t)}
          </m.span>
        </m.li>
      ))}
    </ol>
  );
}

/** "That's me": a signed-in viewer asks the scorer to link a seat (one without an account) to theirs. */
function ClaimButton({ gameId, p }: { gameId: string; p: Player }) {
  const { state, actions } = useApp();
  const [sent, setSent] = useState(false);
  const me = state.session?.user;
  if (!me?.playerId || !p.playerId || p.playerId === me.playerId || sent) return null;
  if (archive.get('players', p.playerId)?.linkedUserId) return null;
  const claim = async () => {
    try {
      await ep.claimSeat(gameId, p.playerId!);
      setSent(true);
      actions.say(lv.claimSent);
    } catch (e) {
      actions.say(
        e instanceof ApiError && e.code === 'player_linked'
          ? lv.claimTaken
          : e instanceof ApiError && e.code === 'claim_pending'
            ? lv.claimPending
            : t.hub.common.errorTitle,
      );
    }
  };
  return (
    <button
      type="button"
      aria-label={lv.thatsMeLabel(p.name)}
      onClick={() => void claim()}
      className="press min-h-11 shrink-0 rounded-xl px-2.5 text-14 font-bold text-[var(--accent)]"
    >
      {lv.thatsMe}
    </button>
  );
}

/** Streaks and hooks from the round that just landed, shown to watchers for a few seconds. */
function useMoments(g: Game | null) {
  const [cards, setCards] = useState<{ id: string; text: string }[]>([]);
  const seen = useRef<number | null>(null);
  const n = g ? doneRounds(g).length : 0;
  useEffect(() => {
    if (!g) return;
    // The first state is history, not news: only rounds that land while watching count.
    if (seen.current !== null && n > seen.current) {
      const items = lastRoundMoments(g)
        .filter(({ e }) => ACH.get(e.code))
        .slice(0, 2)
        .map(({ e, p }) => ({
          id: `${n}:${e.playerId}:${e.code}`,
          text: lv.moment(p.name, `${ACH.get(e.code)?.emoji ?? ''} ${achName(e.code)}`),
        }));
      if (items.length) {
        setCards(items);
        const timer = setTimeout(() => setCards([]), 4500);
        seen.current = n;
        return () => clearTimeout(timer);
      }
    }
    seen.current = n;
  }, [g, n]);
  return cards;
}

/** Calls a watcher makes on the current round, scored when its results land; kept on this screen only. */
function usePredictions(g: Game | null) {
  const [calls, setCalls] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState({ right: 0, of: 0 });
  const round = g ? curRound(g) : null;
  const key = round ? `${round.index}:${round.phase}` : '';
  const lastDone = g ? doneRounds(g).at(-1) : undefined;
  const scored = useRef<number>(-1);
  useEffect(() => {
    if (!lastDone || lastDone.index === scored.current) return;
    scored.current = lastDone.index;
    const mine = Object.entries(calls).filter(([k]) => k.startsWith(`${lastDone.index}:`));
    if (!mine.length) return;
    const right = mine.filter(
      ([k, makes]) => (lastDone.results[k.split(':')[1]] === 'made') === makes,
    ).length;
    setScore((s) => ({ right: s.right + right, of: s.of + mine.length }));
  }, [lastDone, calls]);
  const call = (pid: string, makes: boolean) =>
    round && setCalls((c) => ({ ...c, [`${round.index}:${pid}`]: makes }));
  const callOf = (pid: string) => (round ? calls[`${round.index}:${pid}`] : undefined);
  return { call, callOf, score, open: !!round && round.phase !== 'results', key };
}

export function LivePage({ token }: { token: string }) {
  const { state, actions } = useApp();
  const [st, setSt] = useState<LiveState>({ k: 'connecting' });
  const [watchers, setWatchers] = useState(0);
  const [bursts, burst] = useBursts();
  const [big, setBig] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    let live = true;
    ep.live(token)
      .then((r) => live && setSt(onFrom(r)))
      .catch((e: unknown) => live && setSt(refused(e)));
    const stop = followLive(token, (e) => {
      if (!live) return;
      if (e.type === 'game') setSt(onFrom(e.data));
      else if (e.type === 'reaction') burst(e.kind);
      else if (e.type === 'watchers') setWatchers(e.n);
      else if (e.type === 'revoked') setSt({ k: 'revoked' });
      // The stream was refused for good: the plain read says why.
      else if (e.type === 'closed')
        ep.live(token).then(
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
  }, [token, burst, state.session?.user.id]);
  const game = st.k === 'on' ? st.game : null;
  const moments = useMoments(game);
  const pred = usePredictions(game);
  if (st.k !== 'on')
    return (
      <Page title={lv.title}>
        {st.k === 'connecting' ? (
          <>
            <p className="mb-3 text-15 text-[var(--tx2)]">{lv.connecting}</p>
            <Skeleton rows={4} />
          </>
        ) : st.k === 'members' ? (
          <EmptyState
            icon="locked"
            title={lv.membersOnly}
            body={lv.membersOnlyBody}
            action={
              <PrimaryButton
                className="mt-6 w-full"
                onClick={() => actions.open({ screen: 'signin' })}
              >
                {lv.signIn}
              </PrimaryButton>
            }
          />
        ) : (
          <EmptyState
            icon={st.k === 'revoked' ? 'locked' : st.k === 'offline' ? 'offline' : 'linkBreak'}
            title={st.k === 'revoked' ? lv.revoked : st.k === 'offline' ? lv.offline : lv.notFound}
            action={<OpenApp />}
          />
        )}
      </Page>
    );
  const g = st.game,
    r = curRound(g),
    over = g.status === 'finished';
  // No scorer time yet: the last upload is the last sign of the scorer.
  const seen = st.scorerSeenAt ?? st.updatedAt;
  const quiet = Date.now() - seen > QUIET_MS && !over;
  const bigToggle = (
    <button
      type="button"
      aria-pressed={big}
      onClick={() => setBig(!big)}
      className="press glass min-h-11 !rounded-full px-4 text-14 font-bold"
    >
      {big ? lv.leaveBigScreen : lv.bigScreen}
    </button>
  );
  return (
    <Page
      wide={big}
      title={over ? lv.over : lv.title}
      eyebrow={
        quiet ? lv.quiet(Math.round((Date.now() - seen) / 60e3)) : lv.updated(agoTxt(st.updatedAt))
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <WatchersPill n={watchers} />
        <span className="ml-auto">{bigToggle}</span>
      </div>
      <div aria-live="polite" className="mb-1">
        <AnimatePresence>
          {moments.map((c) => (
            <m.p
              key={c.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass mb-2 px-4 py-3 text-16 font-bold"
            >
              {c.text}
            </m.p>
          ))}
        </AnimatePresence>
      </div>
      {over && st.recapToken && (
        <PrimaryButton
          className="mb-5 w-full"
          onClick={() => actions.open({ screen: 'recap', params: { token: st.recapToken! } })}
        >
          {lv.seeRecap}
        </PrimaryButton>
      )}
      {!over && st.reactions && !big && (
        <ReactionBar token={token} onOff={() => setSt({ ...st, reactions: false })} />
      )}
      {!over && !big && (
        <AnimatePresence mode="wait">
          <m.div
            key={r.index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass mb-5 p-4"
          >
            <div className="disp mb-2 text-20 font-extrabold">
              {lv.round(r.index + 1, r.cards)} · <SuitGlyph trump={r.trump} />
            </div>
            {pred.open && <p className="mb-1 text-13 text-[var(--tx2)]">{lv.predict}</p>}
            <ul className="flex flex-col gap-1 text-15">
              {g.players.map((p, i) => {
                const bid = r.bids[p.id];
                const mine = pred.callOf(p.id);
                return (
                  <li key={p.id} className="flex min-h-11 items-center gap-2">
                    <span aria-hidden className="inline-flex">
                      <Dot p={p} s={22} />
                    </span>
                    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                      {p.name}
                      {i === r.dealerIndex && (
                        <span className="ml-1 text-13 text-[var(--tx2)]">
                          · {t.table.deals.toLowerCase()}
                        </span>
                      )}
                    </span>
                    <span className="text-[var(--tx2)]">
                      {bid !== undefined ? lv.bid(bid) : '…'}
                      {r.results[p.id] &&
                        (r.results[p.id] === 'made' ? ` ${t.table.made}` : ` ${t.table.missed}`)}
                    </span>
                    {pred.open && bid !== undefined && (
                      <span className="flex gap-1">
                        {([true, false] as const).map((makes) => (
                          <button
                            key={String(makes)}
                            type="button"
                            aria-pressed={mine === makes}
                            aria-label={makes ? lv.predictMake(p.name) : lv.predictMiss(p.name)}
                            onClick={() => pred.call(p.id, makes)}
                            className="press grid h-11 w-11 place-items-center rounded-xl bg-ov/[.06] text-18 aria-pressed:bg-[var(--accent)] aria-pressed:text-ink-on-accent"
                          >
                            <span aria-hidden>{makes ? '👍' : '👎'}</span>
                          </button>
                        ))}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {pred.score.of > 0 && (
              <p role="status" className="mt-2 text-13 font-bold text-[var(--tx2)]">
                {lv.predictScore(pred.score.right, pred.score.of)}
              </p>
            )}
          </m.div>
        </AnimatePresence>
      )}
      <Section title={over ? gameLine(g) : t.hub.game.standings}>
        <LiveStandings
          g={g}
          big={big}
          aside={(p) => (state.session && !big ? <ClaimButton gameId={g.syncId} p={p} /> : null)}
        />
      </Section>
      {!big && <OpenApp />}
      <ReactionBurst bursts={bursts} />
    </Page>
  );
}
