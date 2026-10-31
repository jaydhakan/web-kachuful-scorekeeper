import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { curRound, doneRounds, gameStats, standings, type Game } from '@/domain';
import { agoTxt, fmt, sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { ApiError } from '@/sync/api';
import { fromWire } from '@/sync/engine';
import { ep } from '@/sync/endpoints';
import { followLive } from '@/sync/live';
import type { Achievement, GameSummary } from '@/sync/types';
import { EmptyState, Page, Section, Skeleton } from '@/components/ui/Page';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SuitGlyph } from '@/components/ui/SuitGlyph';
import { SPRING } from '@/components/ui/motion';
import { BoardTable } from '@/sheets/BoardBody';
import { ChartLegend, ScoreChart } from '@/screens/desk/ScoreChart';
import { rankTone } from '@/screens/desk/DeskParts';
import { achName } from '@/strings/achievements';
import { ACH } from '@/domain';
import { gameLine } from './HistoryPage';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';

const lv = t.hub.live;
const QUIET_MS = 2 * 60e3;

type LiveState =
  | { k: 'connecting' }
  | { k: 'revoked' }
  | { k: 'missing' }
  | { k: 'on'; game: Game; updatedAt: number; scorerSeenAt: number | null };

function OpenApp() {
  const { actions } = useApp();
  return (
    <PrimaryButton className="mt-6 w-full" onClick={() => actions.navReset()}>
      {lv.open}
    </PrimaryButton>
  );
}

/** A viewer is signed out, so photos come with the public summary rather than from a registry. */
const withPhotos = (g: Game, sum: GameSummary): Game => ({
  ...g,
  players: g.players.map((p) => ({
    ...p,
    photoUrl: sum.players.find((x) => x.playerId === p.playerId)?.photoUrl ?? null,
  })),
});

/** Standings that move as rounds land: changed totals pulse, rows slide to their new place. */
function LiveStandings({ g }: { g: Game }) {
  const rm = useReducedMotion();
  const st = standings(g);
  return (
    <ol className="flex flex-col gap-2">
      {st.map((s) => (
        <motion.li
          key={s.p.id}
          layout={!rm}
          transition={SPRING}
          className="glass flex min-h-14 items-center gap-3 px-4"
        >
          <span className={`disp w-6 text-center text-20 font-extrabold ${rankTone(s.rank)}`}>
            {s.rank}
          </span>
          <Avatar p={s.p} className="grid h-9 w-9 place-items-center rounded-full text-20" />
          <span className="min-w-0 flex-1 text-17 font-bold [overflow-wrap:anywhere]">
            {s.p.name}
          </span>
          <motion.span
            key={s.t}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            className="disp text-22 font-extrabold"
          >
            {fmt(s.t)}
          </motion.span>
        </motion.li>
      ))}
    </ol>
  );
}

export function LivePage({ token }: { token: string }) {
  const [st, setSt] = useState<LiveState>({ k: 'connecting' });
  const [, tick] = useState(0);
  useEffect(() => {
    let live = true;
    ep.live(token)
      .then(
        (r) =>
          live &&
          setSt({
            k: 'on',
            game: withPhotos(fromWire(r.game), r.summary),
            updatedAt: r.updatedAt,
            scorerSeenAt: r.scorerSeenAt,
          }),
      )
      .catch(
        (e: unknown) =>
          live && setSt({ k: e instanceof ApiError && e.status === 410 ? 'revoked' : 'missing' }),
      );
    const stop = followLive(token, (e) => {
      if (!live) return;
      if (e.type === 'game')
        setSt({
          k: 'on',
          game: withPhotos(fromWire(e.data.game), e.data.summary),
          updatedAt: e.data.updatedAt,
          scorerSeenAt: e.data.scorerSeenAt,
        });
      else if (e.type === 'revoked') setSt({ k: 'revoked' });
    });
    const clock = setInterval(() => tick((n) => n + 1), 30e3);
    return () => {
      live = false;
      stop();
      clearInterval(clock);
    };
  }, [token]);
  if (st.k !== 'on')
    return (
      <Page title={lv.title}>
        {st.k === 'connecting' ? (
          <>
            <p className="mb-3 text-15 text-[var(--tx2)]">{lv.connecting}</p>
            <Skeleton rows={4} />
          </>
        ) : (
          <EmptyState
            icon={st.k === 'revoked' ? '🔒' : '🕳️'}
            title={st.k === 'revoked' ? lv.revoked : lv.notFound}
            action={<OpenApp />}
          />
        )}
      </Page>
    );
  const g = st.game,
    r = curRound(g);
  // No scorer time yet: the last upload is the last sign of the scorer.
  const seen = st.scorerSeenAt ?? st.updatedAt;
  const quiet = Date.now() - seen > QUIET_MS && g.status === 'active';
  return (
    <Page
      title={lv.title}
      eyebrow={
        quiet ? lv.quiet(Math.round((Date.now() - seen) / 60e3)) : lv.updated(agoTxt(st.updatedAt))
      }
    >
      {g.status === 'active' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={r.index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass mb-5 p-4"
          >
            <div className="disp mb-2 text-20 font-extrabold">
              {lv.round(r.index + 1, r.cards)} · <SuitGlyph trump={r.trump} />
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-15">
              {g.players.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span aria-hidden>{p.emoji}</span>
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    {p.name}
                    {i === r.dealerIndex && (
                      <span className="ml-1 text-13 text-[var(--tx2)]">
                        · {t.table.deals.toLowerCase()}
                      </span>
                    )}
                  </span>
                  <span className="text-[var(--tx2)]">
                    {r.bids[p.id] !== undefined ? lv.bid(r.bids[p.id]) : '…'}
                    {r.results[p.id] &&
                      (r.results[p.id] === 'made' ? ` ${t.table.made}` : ` ${t.table.missed}`)}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      )}
      <Section title={g.status === 'finished' ? gameLine(g) : t.hub.game.standings}>
        <LiveStandings g={g} />
      </Section>
      <OpenApp />
    </Page>
  );
}

export function RecapPage({ token }: { token: string }) {
  const [st, setSt] = useState<
    { k: 'loading' | 'revoked' | 'missing' } | { k: 'on'; game: Game; ach: Achievement[] }
  >({ k: 'loading' });
  useEffect(() => {
    ep.recap(token).then(
      (r) => setSt({ k: 'on', game: withPhotos(fromWire(r.game), r.summary), ach: r.achievements }),
      (e: unknown) =>
        setSt({ k: e instanceof ApiError && e.status === 410 ? 'revoked' : 'missing' }),
    );
  }, [token]);
  const g = st.k === 'on' ? st.game : null;
  const S = useMemo(() => (g && doneRounds(g).length ? gameStats(g) : null), [g]);
  if (st.k !== 'on' || !g)
    return (
      <Page title={t.hub.recap.title}>
        {st.k === 'loading' ? (
          <Skeleton rows={5} />
        ) : (
          <EmptyState
            icon={st.k === 'revoked' ? '🔒' : '🕳️'}
            title={st.k === 'revoked' ? t.hub.recap.revoked : t.hub.recap.notFound}
            action={<OpenApp />}
          />
        )}
      </Page>
    );
  const done = doneRounds(g);
  const names = new Map(g.players.map((p) => [p.playerId, p]));
  return (
    <Page wide title={gameLine(g)} eyebrow={t.hub.recap.title}>
      <Section title={t.hub.game.standings}>
        <LiveStandings g={g} />
      </Section>
      {S && (
        <Section title={t.hub.recap.highlights}>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 wide:grid-cols-3">
            {(
              [
                ['🎯', t.winner.sharp, S.sharp.p.name, t.winner.exactBids(S.sharp.exact)],
                ['💥', t.winner.big, S.big.p.name, sgnN(S.big.best)],
                ['🔥', t.winner.streak, S.streak.p.name, t.winner.exactInRow(S.streak.maxRun)],
              ] as const
            ).map(([ic, title, who, v]) => (
              <li key={title} className="glass p-3">
                <div className="text-13 font-bold uppercase tracking-[0.08em] text-[var(--tx2)]">
                  {ic} {title}
                </div>
                <div className="text-16 font-bold">{who}</div>
                <div className="text-14 text-[var(--tx2)]">{v}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {done.length > 1 && (
        <Section title={t.hub.game.chart}>
          <div className="glass flex flex-col gap-3 p-4">
            <div className="h-56">
              <ScoreChart g={g} rounds={done} />
            </div>
            <ChartLegend g={g} />
          </div>
        </Section>
      )}
      {st.ach.length > 0 && (
        <Section title={t.hub.game.achievements}>
          <ul className="flex flex-wrap gap-2">
            {st.ach.map((a) => (
              <li key={a.id} className="glass flex items-center gap-2 px-3 py-2 text-14 font-bold">
                <span aria-hidden>{ACH.get(a.code)?.emoji}</span>
                {names.get(a.playerId)?.name} · {achName(a.code)}
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title={t.hub.game.rounds}>
        <div className="rounded-2xl bg-sheet p-2">
          <BoardTable g={g} />
        </div>
      </Section>
      <OpenApp />
    </Page>
  );
}
