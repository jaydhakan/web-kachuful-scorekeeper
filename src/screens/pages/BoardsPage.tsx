import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  leaderboard,
  rangeFor,
  RATE_METRICS,
  type BoardRow,
  type Facts,
  type Metric,
  type Range,
  type Streak,
} from '@/domain';
import { useApp } from '@/state/store';
import { useDeviceFacts, whoIs } from '@/state/useFacts';
import { Chip, ChipRow, EmptyState, Page, Section } from '@/components/ui/Page';
import { MetricChips, pct, Progress, RangeChips, RankDelta } from '@/components/ui/Stats';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SPRING } from '@/components/ui/motion';
import { rankTone } from '@/screens/desk/DeskParts';
import { t } from '@/strings';

const b = t.hub.boards;

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

export function BoardsPage({
  global,
}: {
  global?: (q: { range: Range; metric: Metric }) => BoardData | 'signedOut' | 'loading';
}) {
  const [scope, setScope] = useState<'global' | 'device'>(global ? 'global' : 'device');
  const [range, setRange] = useState<Range>(() => rangeFor('month', Date.now()));
  const [metric, setMetric] = useState<Metric>('avgPerRound');
  const f = useDeviceFacts();
  const device = useMemo(
    () => ({ ...leaderboard(f, { from: range.from, to: range.to, metric }), facts: f }),
    [f, range, metric],
  );
  const data = scope === 'device' ? device : (global?.({ range, metric }) ?? 'signedOut');
  return (
    <Page
      title={b.title}
      sub={
        <div className="flex flex-col gap-2">
          <ChipRow label={b.scope}>
            <Chip on={scope === 'global'} onClick={() => setScope('global')}>
              🌍 {b.global}
            </Chip>
            <Chip on={scope === 'device'} onClick={() => setScope('device')}>
              📱 {b.device}
            </Chip>
          </ChipRow>
          <RangeChips value={range} onChange={setRange} />
          <MetricChips value={metric} onChange={setMetric} />
        </div>
      }
    >
      {data === 'signedOut' ? (
        <SignedOut />
      ) : data === 'loading' ? null : (
        <BoardList
          data={data}
          metric={metric}
          key={`${scope}-${range.from}-${range.to}-${metric}`}
        />
      )}
    </Page>
  );
}

function SignedOut() {
  const { actions } = useApp();
  return (
    <EmptyState
      icon="🌍"
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
}: {
  data: BoardData;
  metric: Metric;
  you?: string | null;
}) {
  const rate = RATE_METRICS.includes(metric);
  const ranked = data.rows.filter((r) => r.qualified),
    rest = data.rows.filter((r) => !r.qualified);
  if (!data.rows.length) return <EmptyState icon="🃏" title={b.emptyTitle} body={b.emptyBody} />;
  return (
    <>
      {rate && !ranked.length && (
        <p className="glass mb-4 p-4 text-15 leading-[1.45] text-[var(--tx2)]">
          {b.nobodyRanked(data.minRounds)}
        </p>
      )}
      {ranked.length > 0 && (
        <ol className="flex flex-col gap-2">
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
        </ol>
      )}
      {rest.length > 0 && (
        <Section title={b.unranked(data.minRounds)} className="mt-6">
          <ol className="flex flex-col gap-2">
            {rest.map((r, i) => (
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
          </ol>
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
  const w = whoIs(facts, r.playerId);
  const run = facts ? lastRun(facts, r.playerId) : null;
  const value = fmtValue(metric, r.value);
  return (
    <motion.li
      layout={!rm}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: rm ? 0 : Math.min(i, 12) * 0.02 }}
      className={you ? 'sticky bottom-2 top-2 z-10' : ''}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => actions.open({ screen: 'player', params: { id: r.playerId } })}
        aria-label={b.row(r.rank ? `#${r.rank}` : b.unrankedShort, w.name, value)}
        className={`glass flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left ${you ? 'shadow-[inset_0_0_0_1.5px_var(--accent)]' : ''}`}
      >
        <span
          className={`disp w-8 text-center text-22 font-extrabold ${r.rank ? rankTone(r.rank) : 'text-[var(--tx2)]'}`}
        >
          {r.rank ?? '–'}
        </span>
        <RankDelta d={r.rankDelta} />
        <span
          aria-hidden
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-22 ${need ? 'opacity-60' : ''}`}
          style={{ background: w.color }}
        >
          {w.emoji}
        </span>
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
      </motion.button>
    </motion.li>
  );
}
