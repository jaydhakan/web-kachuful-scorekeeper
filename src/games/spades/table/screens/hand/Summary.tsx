import { m, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  dealerFor,
  gameResult,
  seatsOf,
  type SpGame,
  type SpHand,
  type TeamId,
  type TeamScore,
} from '@/games/spades/domain';
import { spTable as s } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { lineOf } from '@/games/spades/table/state/select';
import { Counter } from '@/components/ui/Counter';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EASE, REDUCED, SPRING_POP, SPRING_SOFT } from '@/components/ui/motion';
import { vibrate } from '@/hooks/useHaptics';
import { TEAM_TONE } from '../parts';
import { HandFrame } from './HandFrame';
import { HandPops } from '@/games/spades/progress/HandPops';
import { pidOf } from '@/people/pid';
import { bostonOf } from '@/games/spades/online/table/present';

const BostonMoment = lazy(() =>
  import('@/games/spades/ui/Boston').then((m) => ({ default: m.BostonMoment })),
);
const signed = (v: number) => s.sgn(Math.round(v));

/** The headline under the title: who won, a tie at the target, or what the game is played to. */
function verdict(g: SpGame): string {
  if (g.status === 'finished' && g.result)
    return g.result.winner === 'draw' ? s.summary.draw : s.summary.wins(s.team(g.result.winner));
  if (gameResult(g) === 'tie') return s.summary.tie;
  return g.rules.target === null ? s.summary.endless : s.summary.toWin(g.rules.target);
}

function Line({
  k,
  v,
  tone = '',
  i,
  fresh,
}: {
  k: string;
  v: ReactNode;
  tone?: string;
  i: number;
  fresh: boolean;
}) {
  return (
    <m.div
      initial={fresh ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_SOFT, delay: fresh ? 0.15 + i * 0.045 : 0 }}
      className="flex items-baseline justify-between gap-2 border-b border-ov/10 py-1.5 text-14"
    >
      <dt className="text-[var(--tx2)]">{k}</dt>
      <dd className={`tick text-right font-bold ${tone}`}>{v}</dd>
    </m.div>
  );
}

function Column({
  g,
  h,
  t,
  r,
  before,
  after,
  fresh,
}: {
  g: SpGame;
  h: SpHand;
  t: TeamId;
  r: TeamScore;
  before: number;
  after: number;
  fresh: boolean;
}) {
  const rm = useReducedMotion();
  const [x, y] = seatsOf(t);
  const bid = (k: number) => `${g.players[k].name} ${s.bidText(h.bids[k] ?? 0, h.blind[k])}`;
  const took = (h.teamTricks ?? [0, 0])[t === 'a' ? 0 : 1];
  const lines: [string, ReactNode, string?][] = [
    [s.summary.bids, `${bid(x)} · ${bid(y)}`],
    [s.summary.contract, r.made === null ? '—' : r.contract],
    [s.summary.took, took],
  ];
  if (r.made !== null) {
    lines.push([
      s.summary.result,
      <span
        key="v"
        className={`rounded-full px-2 py-0.5 text-13 font-extrabold ${r.made ? 'bg-[color-mix(in_srgb,var(--pos)_16%,transparent)] text-[var(--pos)]' : 'bg-[color-mix(in_srgb,var(--neg)_16%,transparent)] text-[var(--neg)]'}`}
      >
        {r.made ? s.summary.made : s.summary.set}
      </span>,
    ]);
    lines.push([
      s.summary.contractPts,
      signed(r.made ? 10 * r.contract : -10 * r.contract),
      r.made ? 'text-[var(--pos)]' : 'text-[var(--neg)]',
    ]);
  }
  for (const n of r.nils)
    lines.push([
      s.summary.nilLine(g.players[n.seat].name, n.blind),
      signed(n.points),
      n.made ? 'text-[var(--gold-tx)]' : 'text-[var(--neg)]',
    ]);
  if (r.bags) lines.push([s.summary.bags, `+${r.bags}`]);
  if (r.penalty) lines.push([s.summary.penalty, signed(-100 * r.penalty), 'text-[var(--neg)]']);
  const stampAt = 0.15 + lines.length * 0.045 + 0.2;
  return (
    <section
      aria-labelledby={`sp-sum-${t}`}
      className="glass relative isolate flex min-w-0 flex-col overflow-hidden p-3"
    >
      <h3 id={`sp-sum-${t}`} className="mb-1 flex items-center gap-1.5 text-15 font-bold">
        <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${TEAM_TONE[t].dot}`} />
        {s.team(t)}
      </h3>
      <dl>
        {lines.map(([k, v, tone], i) => (
          <Line key={k} k={k} v={v} tone={tone} i={i} fresh={fresh} />
        ))}
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 pt-3">
          <dt className="text-14 font-semibold">{s.summary.thisHand}</dt>
          <dd
            className={`disp tick text-24 font-extrabold min-[400px]:text-28 ${r.net >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}
          >
            <Counter
              swell="scale"
              from={fresh ? 0 : r.net}
              to={r.net}
              run={fresh}
              delay={0.5}
              duration={0.9}
              format={signed}
            />
          </dd>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 py-1">
          <dt className="text-14 text-[var(--tx2)]">{s.summary.total}</dt>
          <dd className="disp tick text-20 font-extrabold">
            <Counter
              swell="scale"
              from={fresh ? before : after}
              to={after}
              run={fresh}
              delay={1.4}
              duration={0.9}
            />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 py-1">
          <dt className="text-14 text-[var(--tx2)]">{s.summary.carried}</dt>
          <dd className="tick text-14 font-bold">{s.summary.carriedOf(r.bagsAfter % 10)}</dd>
        </div>
      </dl>
      {r.made === false && (
        // The SET stamp lands once the lines are in; reduced motion fades it in where it rests.
        <m.span
          aria-hidden
          initial={fresh ? (rm ? { opacity: 0 } : { opacity: 0, scale: 1.6, rotate: -18 }) : false}
          animate={{ opacity: 1, scale: 1, rotate: -12 }}
          transition={
            fresh
              ? rm
                ? { duration: REDUCED, delay: stampAt }
                : { ...SPRING_POP, delay: stampAt }
              : undefined
          }
          onAnimationStart={() => fresh && setTimeout(() => vibrate(18), stampAt * 1000)}
          className="pointer-events-none absolute right-2 top-2 rounded-md border-2 border-[var(--neg)] px-1.5 py-0.5 text-13 font-extrabold tracking-[0.08em] text-[var(--neg)] opacity-90"
        >
          {s.summary.stamp(-10 * r.contract)}
        </m.span>
      )}
    </section>
  );
}

/** The hand summary: each team's lines, this hand's points counting up, the new totals, then the next hand or the winner. */
export default function Summary({ g, h }: { g: SpGame; h: SpHand }) {
  const { state, actions } = useSp();
  const rm = useReducedMotion();
  // Counted up on its first showing only; reopening the summary later shows it settled.
  const [fresh] = useState(() => state.fresh && !rm);
  // The hand's moments pop on its first showing only, reduced motion or not.
  const [first] = useState(() => state.fresh);
  const [bostonOver, setBostonOver] = useState(false);
  const nameOf = useCallback(
    (id: string) => g.players.find((p) => pidOf(p) === id)?.name ?? '',
    [g.players],
  );
  useEffect(() => {
    if (state.fresh) actions.setFresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, as the summary opens
  }, []);
  const data = lineOf(g, h.index);
  if (!data) return null;
  const { line, before } = data;
  const over = g.status === 'finished';
  // A team that took all 13: BOSTON stamps over the summary, once, as it first opens (S1; no trick piles here).
  const boston = bostonOf(h);
  const next = g.players[dealerFor(g, h.index + 1)].name;
  return (
    <>
      <HandFrame
        g={g}
        h={h}
        bar={
          over ? (
            <PrimaryButton className="w-full" onClick={() => actions.go('winner')}>
              {s.summary.winner}
            </PrimaryButton>
          ) : (
            <PrimaryButton className="w-full flex-col !gap-0" onClick={actions.nextHand}>
              <span>{s.summary.next}</span>
              <span className="text-13 font-medium opacity-80">{s.summary.nextDeals(next)}</span>
            </PrimaryButton>
          )
        }
      >
        <m.h2
          initial={fresh ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="disp mb-1 text-26 font-extrabold tracking-[-0.03em]"
        >
          {s.summary.title(h.index + 1)}
        </m.h2>
        <p
          className={`mb-3 text-15 ${over ? 'font-bold text-[var(--gold-tx)]' : 'text-[var(--tx2)]'}`}
          role="status"
        >
          {verdict(g)}
        </p>
        <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
          {(['a', 'b'] as const).map((t) => (
            <Column
              key={t}
              g={g}
              h={h}
              t={t}
              r={line[t]}
              before={before[t]}
              after={line.after[t]}
              fresh={fresh}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => actions.openSheet({ type: 'edit', i: h.index })}
            className="press min-h-12 px-4 text-15 font-semibold text-[var(--accent-tx)] underline decoration-ov/25 underline-offset-4"
          >
            {s.summary.edit}
          </button>
        </div>
      </HandFrame>
      {first && boston && (
        <Suspense fallback={null}>
          <BostonMoment
            id={`boston:${g.id}:${h.index}`}
            team={boston}
            name={s.team(boston)}
            onEnd={() => setBostonOver(true)}
          />
        </Suspense>
      )}
      {/* The hand's cards follow its Boston, never land on it. */}
      {first && (!boston || bostonOver) && <HandPops game={g} index={h.index} nameOf={nameOf} />}
    </>
  );
}
