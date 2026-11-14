import { useCallback, useMemo, useRef, useState } from 'react';
import {
  leaderboard,
  rangeFor,
  RATE_METRICS,
  type BoardRow,
  type Facts,
  type Metric,
  type Range,
  type Streak,
} from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { findWho, useDeviceFacts, whoIs } from '@/games/kachuful/state/useFacts';
import { EmptyState, Page } from '@/components/ui/Page';
import { DeltaIntro, MetricPick, pct, RangePick } from '@/components/ui/Stats';
import { RankBoard, type BoardEntry } from '@/components/ui/RankBoard';
import { Seg } from '@/components/ui/Seg';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ep } from '@/sync/endpoints';
import { useRemote } from '@/sync/useRemote';
import { RemoteGate } from '@/components/RemoteGate';
import { t } from '@/strings';
import type { Face } from '@/components/ui/Avatar';
import { icon } from '@/components/ui/IconsMore';

const b = t.hub.leaderboard;

/** A board value as people read it: a whole-number average, a percentage, or a count. */
export function fmtValue(m: Metric, v: number): string {
  if (m === 'accuracy' || m === 'winRate') return pct(v);
  return String(Math.round(v));
}

/** The distance between two board values: an average keeps a decimal, since two players a rank apart can round alike. */
export function fmtGap(m: Metric, d: number): string {
  if (m === 'accuracy' || m === 'winRate') return pct(d);
  // One decimal only where it says something: "0.4 behind", but "2 behind", not "2.0".
  return String(m === 'avgPerRound' ? Math.round(d * 10) / 10 : Math.round(d));
}

/** A player's run as of their last round, for the badge. */
export function lastRun(f: Facts, id: string): Streak | null {
  let last = null as Facts['rounds'][number] | null;
  for (const r of f.rounds) if (r.playerId === id && (!last || r.doneAt >= last.doneAt)) last = r;
  if (!last) return null;
  return last.runHot ? { kind: 'hot', n: last.runHot } : { kind: 'cold', n: last.runCold };
}

export interface BoardData {
  rows: BoardRow[];
  minRounds: number;
  facts: Facts | null;
  /** The server's own look for each player, for one this device has never met. */
  people?: Map<string, Face & { name: string }>;
}

export function LeaderboardPage() {
  const { state } = useApp();
  const signedIn = !!state.session;
  const [scope, setScope] = useState<'global' | 'device'>(signedIn ? 'global' : 'device');
  const [range, setRange] = useState<Range>(() => rangeFor('month', Date.now()));
  const [metric, setMetric] = useState<Metric>('avgPerRound');
  const [intro] = useState(() => ({ done: false }));
  const f = useDeviceFacts();
  // An empty range offers the whole history in one tap (on the 1st of a month "This month" is empty).
  const showAll = range.kind === 'all' ? undefined : () => setRange(rangeFor('all', Date.now()));
  const device = useMemo(
    () => ({ ...leaderboard(f, { from: range.from, to: range.to, metric }), facts: f }),
    [f, range, metric],
  );
  return (
    <DeltaIntro.Provider value={intro}>
      <Page
        wide
        title={b.title}
        sub={
          <div className="flex flex-col gap-2">
            <Seg
              uid="board-scope"
              label={b.scope}
              value={scope}
              onChange={setScope}
              className="self-start"
              options={[
                {
                  v: 'global',
                  label: (
                    <span className="flex items-center gap-1.5">
                      {icon('globe')}
                      {b.global}
                    </span>
                  ),
                },
                {
                  v: 'device',
                  label: (
                    <span className="flex items-center gap-1.5">
                      {icon('phone')}
                      {b.device}
                    </span>
                  ),
                },
              ]}
            />
            <div className="flex gap-2">
              <RangePick value={range} onChange={setRange} />
              <MetricPick value={metric} onChange={setMetric} />
            </div>
          </div>
        }
      >
        {scope === 'device' ? (
          <BoardList
            data={device}
            metric={metric}
            you={state.session?.player?.id}
            onShowAll={showAll}
            celebrate={`kachuful:device:${metric}:${range.kind}`}
          />
        ) : !signedIn ? (
          <SignedOut />
        ) : (
          <GlobalBoard
            range={range}
            metric={metric}
            you={state.session?.player?.id}
            onShowAll={showAll}
          />
        )}
      </Page>
    </DeltaIntro.Provider>
  );
}

/** The server's board for everyone; the row of the signed-in player stays pinned in view. */
function GlobalBoard({
  range,
  metric,
  you,
  onShowAll,
}: {
  range: Range;
  metric: Metric;
  you?: string;
  onShowAll?: () => void;
}) {
  const key = `lb:${range.from}:${range.to}:${metric}`;
  const r = useRemote(key, (o) => ep.leaderboard(range.from, range.to, metric, o));
  // The last board and the metric it was sorted by stay up while the next one loads, so the list is never
  // unmounted and rows can slide to their new rank. A new answer is a new object; the old key's is the same one.
  const held = useRef<{ lb: NonNullable<typeof r.data>; metric: Metric; kind: string } | null>(
    null,
  );
  if (r.data && r.data !== held.current?.lb)
    held.current = { lb: r.data, metric, kind: range.kind };
  const h = held.current;
  const people = useMemo(
    () =>
      new Map(
        (h?.lb.rows ?? []).map(({ player: p }) => [
          p.id,
          { name: p.displayName, emoji: p.emoji, color: p.color, photoUrl: p.photoUrl, id: p.id },
        ]),
      ),
    [h?.lb],
  );
  const stale = r.data == null && !r.error && !!h;
  return (
    <div aria-busy={stale} className={stale ? 'opacity-60' : ''}>
      <RemoteGate r={stale ? { ...r, data: h.lb } : r}>
        {() =>
          h && (
            <BoardList
              you={you}
              metric={h.metric}
              onShowAll={onShowAll}
              celebrate={`kachuful:global:${h.metric}:${h.kind}`}
              data={{
                minRounds: h.lb.minRounds,
                facts: null,
                people,
                rows: h.lb.rows.map(({ player, ...row }) => ({ ...row, playerId: player.id })),
              }}
            />
          )
        }
      </RemoteGate>
    </div>
  );
}

function SignedOut() {
  const { actions } = useApp();
  return (
    <EmptyState
      icon="globe"
      title={b.signedOutTitle}
      body={b.signedOutBody}
      action={
        <PrimaryButton className="px-8" onClick={() => actions.open({ screen: 'signin' })}>
          {b.signIn}
        </PrimaryButton>
      }
    />
  );
}

/** A Kachuful board (the leaderboard's, or a season's standings) drawn by the board every game shares. */
export function BoardList({
  data,
  metric,
  you,
  onShowAll,
  podium,
  celebrate,
}: {
  data: BoardData;
  metric: Metric;
  you?: string | null;
  onShowAll?: () => void;
  podium?: boolean;
  celebrate?: string;
}) {
  const { actions } = useApp();
  const show = useCallback((v: number) => fmtValue(metric, v), [metric]);
  const gap = useCallback((d: number) => fmtGap(metric, d), [metric]);
  const need = data.minRounds + 1;
  const entries = useMemo<BoardEntry[]>(
    () =>
      data.rows.map((r) => {
        const seen = findWho(data.facts, r.playerId);
        return {
          id: r.playerId,
          who: seen ?? data.people?.get(r.playerId) ?? whoIs(data.facts, r.playerId),
          rank: r.qualified ? r.rank : null,
          n: r.value,
          sub: b.sub(r.games, r.rounds),
          delta: r.rankDelta,
          progress: r.qualified
            ? undefined
            : { v: r.rounds, of: need, label: b.progress(r.rounds, need) },
          badge: <StreakBadge s={data.facts ? lastRun(data.facts, r.playerId) : null} />,
        };
      }),
    [data, need],
  );
  if (!data.rows.length)
    return (
      <EmptyState
        card
        icon="cards"
        title={b.emptyTitle}
        body={b.emptyBody}
        action={
          onShowAll && (
            <PrimaryButton tone="glass" className="px-8" onClick={onShowAll}>
              {b.showAll}
            </PrimaryButton>
          )
        }
      />
    );
  return (
    <RankBoard
      entries={entries}
      show={show}
      gap={gap}
      you={you}
      podium={podium}
      celebrate={celebrate}
      onOpen={(id) => actions.open({ screen: 'player', params: { id } })}
      label={b.row}
      unrankedShort={b.unrankedShort}
      unrankedTitle={b.unranked(data.minRounds)}
      note={
        RATE_METRICS.includes(metric) &&
        !data.rows.some((r) => r.qualified) && (
          <p className="glass mb-4 p-4 text-15 leading-[1.45] text-[var(--tx2)]">
            {b.nobodyRanked(data.minRounds)}
          </p>
        )
      }
    />
  );
}
