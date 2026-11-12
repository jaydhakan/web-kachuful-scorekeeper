import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { useDeviceFacts, whoIs } from '@/games/kachuful/state/useFacts';
import { EmptyState, Page, Section } from '@/components/ui/Page';
import { DeltaIntro, MetricPick, pct, Progress, RangePick, RankDelta } from '@/components/ui/Stats';
import { Seg } from '@/components/ui/Seg';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PRESS, REDUCED, SPRING } from '@/components/ui/motion';
import { rankTone } from '@/games/kachuful/screens/desk/DeskParts';
import { ep } from '@/sync/endpoints';
import { useRemote } from '@/sync/useRemote';
import { RemoteGate } from '@/components/RemoteGate';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';
import { icon } from '@/components/ui/IconsMore';
import { Edge } from '@/components/ui/Edge';

const b = t.hub.leaderboard;
/** Unranked rows shown before "Show all"; ranked rows are never folded. */
const UNRANKED_FOLD = 10;

/** A board value as people read it: a whole-number average, a percentage, or a count. */
export function fmtValue(m: Metric, v: number): string {
  if (m === 'accuracy' || m === 'winRate') return pct(v);
  return String(Math.round(v));
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
  const held = useRef<{ lb: NonNullable<typeof r.data>; metric: Metric } | null>(null);
  if (r.data && r.data !== held.current?.lb) held.current = { lb: r.data, metric };
  const h = held.current;
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
              data={{
                minRounds: h.lb.minRounds,
                facts: null,
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

export function BoardList({
  data,
  metric,
  you,
  onShowAll,
}: {
  data: BoardData;
  metric: Metric;
  you?: string | null;
  onShowAll?: () => void;
}) {
  const rate = RATE_METRICS.includes(metric);
  const [unfolded, setUnfolded] = useState(false);
  const ranked = data.rows.filter((r) => r.qualified),
    rest = data.rows.filter((r) => !r.qualified);
  const folded = !unfolded && rest.length > UNRANKED_FOLD;
  // Your own row stays in view when folded, so the pinned "You" row still has something to pin.
  const shown = folded ? rest.filter((r, i) => i < UNRANKED_FOLD || r.playerId === you) : rest;
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
    <>
      {rate && !ranked.length && (
        <p className="glass mb-4 p-4 text-15 leading-[1.45] text-[var(--tx2)]">
          {b.nobodyRanked(data.minRounds)}
        </p>
      )}
      {ranked.length > 0 && (
        <ol className="flex flex-col gap-2">
          <AnimatePresence>
            {ranked.map((r, i) => (
              <Row
                key={r.playerId}
                r={r}
                i={i}
                metric={metric}
                facts={data.facts}
                you={you === r.playerId}
              />
            ))}
          </AnimatePresence>
        </ol>
      )}
      {rest.length > 0 && (
        <Section title={b.unranked(data.minRounds)} className="mt-6">
          <ol className="flex flex-col gap-2">
            <AnimatePresence>
              {shown.map((r, i) => (
                <Row
                  key={r.playerId}
                  r={r}
                  i={ranked.length + i}
                  metric={metric}
                  facts={data.facts}
                  need={data.minRounds + 1}
                  you={you === r.playerId}
                />
              ))}
            </AnimatePresence>
          </ol>
          {folded && (
            <button
              type="button"
              onClick={() => setUnfolded(true)}
              className="press glass mt-4 min-h-12 w-full rounded-2xl font-bold"
            >
              {b.showAllUnranked(rest.length)}
            </button>
          )}
        </Section>
      )}
    </>
  );
}

function Row({
  r,
  i,
  metric,
  facts,
  need,
  you,
}: {
  r: BoardRow;
  i: number;
  metric: Metric;
  facts: Facts | null;
  need?: number;
  you?: boolean;
}) {
  const { actions } = useApp();
  const rm = useReducedMotion();
  const intro = useContext(DeltaIntro);
  // Read at mount: the first list of a visit rises in row by row; a row that joins after a filter change only fades.
  const [rise] = useState(() => !intro?.done && !rm);
  useEffect(() => {
    if (intro) intro.done = true;
  }, [intro]);
  const w = whoIs(facts, r.playerId);
  const run = facts ? lastRun(facts, r.playerId) : null;
  const value = fmtValue(metric, r.value);
  return (
    <m.li
      layout={rm ? false : 'position'}
      initial={rise ? { opacity: 0, y: 8 } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: REDUCED } }}
      // The stagger belongs to the entrance only: a re-rank slides at once.
      transition={{
        layout: SPRING,
        default: rise ? { ...SPRING, delay: Math.min(i, 12) * 0.02 } : { duration: REDUCED },
      }}
      // The pinned row floats over the list, so it needs a shadow to not read as the row beneath it.
      className={
        you
          ? 'sticky bottom-2 top-2 z-10 rounded-[var(--r-card,22px)] shadow-[0_10px_28px_-6px_var(--drop)]'
          : ''
      }
    >
      <m.button
        type="button"
        whileTap={PRESS}
        onClick={() => actions.open({ screen: 'player', params: { id: r.playerId } })}
        aria-label={b.row(r.rank ? `#${r.rank}` : b.unrankedShort, w.name, value)}
        className="glass relative flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left"
      >
        {you && <Edge tone="accent" />}
        {/* The movement sits under the rank, so rows without one don't leave a gap before the avatar. */}
        <span className="flex w-8 shrink-0 flex-col items-center">
          <span
            className={`disp text-22 font-extrabold leading-none ${r.rank ? rankTone(r.rank) : 'text-[var(--tx2)]'}`}
          >
            {r.rank ?? '–'}
          </span>
          <RankDelta d={r.rankDelta} i={i} />
        </span>
        <Avatar
          p={w}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-22 ${need ? 'opacity-60' : ''}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-17 font-bold leading-tight [overflow-wrap:anywhere]">
            {w.name}
            {you && <span className="ml-1.5 text-13 font-bold text-[var(--accent)]">{b.you}</span>}
            <StreakBadge s={run} />
          </span>
          <span className="mt-0.5 block text-13 text-[var(--tx2)]">{b.sub(r.games, r.rounds)}</span>
          {need && (
            <span className="mt-1 flex items-center gap-2 text-13 text-[var(--tx2)]">
              <Progress v={r.rounds} of={need} />
              <span className="shrink-0">{b.progress(r.rounds, need)}</span>
            </span>
          )}
        </span>
        <span className={`disp shrink-0 text-24 font-extrabold ${need ? 'text-[var(--tx2)]' : ''}`}>
          {value}
        </span>
      </m.button>
    </m.li>
  );
}
