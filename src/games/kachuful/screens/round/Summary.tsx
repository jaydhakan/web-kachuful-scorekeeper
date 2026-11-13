import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  bidOrder,
  currentStreaks,
  curRound,
  doneRounds,
  pts,
  roundAt,
  standings,
  totals,
  type Outcome,
  type Player,
} from '@/games/kachuful/domain';
import { sgnN } from '@/lib/format';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useApp } from '@/games/kachuful/state/store';
import { palette } from '@/theme/palette';
import { MQ } from '@/theme/breakpoints';
import { Counter } from '@/components/ui/Counter';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { Glass } from '@/components/ui/Glass';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table } from '@/components/ui/Table';
import { EASE, REDUCED, SPRING_POP } from '@/components/ui/motion';
import { shakeKF } from '@/components/ui/stagger';
import { RoundFrame } from './RoundFrame';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';

function Spark({ color }: { color: string }) {
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2,
          d = 26 + (i % 3) * 8;
        return (
          <m.i
            key={i}
            aria-hidden
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="pointer-events-none absolute right-24 top-1/2 h-1.5 w-1.5 rounded-full"
            style={{ background: i % 3 === 0 ? palette['gold-light'] : color }}
          />
        );
      })}
    </>
  );
}

const rankColor = (rank: number) =>
  rank === 1
    ? palette.gold
    : rank === 2
      ? palette['rank-silver']
      : rank === 3
        ? palette['rank-bronze']
        : 'var(--tx)';

/** One rival passed, in ms. */
export const CLIMB_STEP = 170;
const CLIMB_EASE: [number, number, number, number] = [0.65, 0, 0.35, 1];
const REORDER = { type: 'spring', stiffness: 260, damping: 30 } as const;
/** How a standings row moves to its new place: one quick step per rival on a comeback, today's spring otherwise. */
export const rowMove = (climbing: boolean) =>
  climbing ? { duration: CLIMB_STEP / 1000, ease: CLIMB_EASE } : REORDER;
/** Between two deltas landing on an all-but-one round, in ms. */
const LAND_GAP = 60;
const REDUCED_T = [60, 120, 180, 240, 300];

interface Ranked {
  p: { id: string };
  rank: number;
}

/** Who came from third or lower to sole first this round, by the ranks `standings` gives; null on any other round. */
export function comeback(prev: Ranked[], cur: Ranked[]): string | null {
  const top = cur[0];
  if (!top || cur[1]?.rank === 1) return null;
  const was = prev.find((x) => x.p.id === top.p.id)?.rank ?? 1;
  return was - top.rank >= 2 ? top.p.id : null;
}

/** The orders a climb passes through, one rival at a time; the last is the final order, so the rest settle with it. */
export function climbOrders(before: string[], after: string[], id: string): string[][] {
  const from = before.indexOf(id);
  if (from < 1) return [];
  const rest = before.filter((x) => x !== id);
  return Array.from({ length: from }, (_, k) =>
    k === from - 1 ? after : [...rest.slice(0, from - 1 - k), id, ...rest.slice(from - 1 - k)],
  );
}

/** The climb for this round's change in standings; empty unless it is a comeback. */
export function climbFor(prev: Ranked[], cur: Ranked[]): string[][] {
  const id = comeback(prev, cur);
  const ids = (a: Ranked[]) => a.map((x) => x.p.id);
  return id ? climbOrders(ids(prev), ids(cur), id) : [];
}

/** The one player who missed when everyone else made it. Four or more players: with three it is too common. */
export function soleMiss<P extends { id: string }>(
  players: P[],
  results: Record<string, Outcome>,
): P | null {
  if (players.length < 4 || !players.every((p) => results[p.id])) return null;
  const missed = players.filter((p) => results[p.id] === 'missed');
  return missed.length === 1 ? missed[0] : null;
}

/**
 * The summary's stages on their timers. A comeback adds a step per rival passed and pushes the reorder and everything
 * after it back by as much; `lands` deltas arrive one after another instead of together.
 */
export function useSumStages(T: number[], climb: string[][], lands: number) {
  const { state, actions } = useApp();
  const anim = state.sumAnim,
    rm = useReducedMotion();
  const [stage, setStage] = useState(anim ? 0 : 5);
  const [step, setStep] = useState(0);
  const [landed, setLanded] = useState(0);
  // A streak celebration plays first; the count-up waits for it.
  const celebrating = !!state.streakFx;
  useEffect(() => {
    if (!anim || celebrating) return;
    const mid = rm ? 0 : Math.max(0, climb.length - 1),
      push = mid * CLIMB_STEP;
    const at = (rm ? REDUCED_T : T).map((ms, i) => (i >= 2 ? ms + push : ms));
    const ts = [
      ...at.map((ms, i) => setTimeout(() => setStage(i + 1), ms)),
      ...Array.from({ length: mid }, (_, i) =>
        setTimeout(() => setStep(i + 1), at[2] - push + i * CLIMB_STEP),
      ),
      ...Array.from({ length: rm ? 0 : Math.max(0, lands - 1) }, (_, i) =>
        setTimeout(() => setLanded(i + 1), at[0] + (i + 1) * LAND_GAP),
      ),
      setTimeout(() => actions.setSumAnim(false), at[4] + 100),
    ];
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one run, once nothing plays over the screen
  }, [celebrating]);
  // Past the deltas stage nothing is held back, whatever happened to the timers.
  return { stage, step, landed: rm || stage !== 1 ? Infinity : landed, rm };
}

/** When each made player's delta lands on an all-but-one round: their place in bid order. Empty on other rounds. */
export function landOrder(
  players: Player[],
  order: number[],
  results: Record<string, Outcome>,
): Record<string, number> {
  if (!soleMiss(players, results)) return {};
  const made = order.map((i) => players[i].id).filter((id) => results[id] === 'made');
  return Object.fromEntries(made.map((id, i) => [id, i]));
}

/** "Everyone but Dev made it": a quiet line, announced once because the text arrives after the status exists. */
export function AllButOne({
  name,
  show,
  anim,
  className = '',
}: {
  name: string;
  show: boolean;
  anim: boolean;
  className?: string;
}) {
  const rm = useReducedMotion();
  return (
    <p role="status" className={`min-h-5 font-semibold leading-5 text-[var(--tx2)] ${className}`}>
      {show && (
        <m.span
          className="inline-block"
          initial={anim ? { opacity: 0, y: rm ? 0 : 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: rm ? REDUCED : 0.25, ease: EASE }}
        >
          {t.summary.allButOne(name)}
        </m.span>
      )}
    </p>
  );
}

export function Summary() {
  const { state, actions } = useApp();
  const g = state.game,
    r = curRound(g),
    anim = state.sumAnim;
  // CSS cannot swap the table's geometry, so this is the one place a layout rule is read in JS.
  const wide = useMediaQuery(MQ.wide);
  /* The "before" board is frozen when the screen opens so the count-up has something to animate from. */
  /* eslint-disable react-hooks/exhaustive-deps */
  const prevR = useMemo(() => doneRounds(g).filter((x) => x !== r), []);
  const prev = useMemo(() => standings(g, prevR), []);
  const pt = useMemo(() => totals(g, prevR), []);
  /* eslint-enable react-hooks/exhaustive-deps */
  const cur = standings(g),
    ct = totals(g),
    sk = currentStreaks(g);
  const climb = climbFor(prev, cur),
    miss = soleMiss(g.players, r.results),
    wait = landOrder(g.players, bidOrder(g, r), r.results);
  const { stage, step, landed, rm } = useSumStages(
    [350, 1000, 1850, 2450, 3300],
    climb,
    Object.keys(wait).length,
  );
  // Mid-climb the rows keep their old ranks; the numbers change when the last step lands.
  const list =
    stage >= 3
      ? cur
      : step > 0
        ? climb[step - 1].map((id) => prev.find((x) => x.p.id === id)!)
        : prev;
  const changed = prev[0].p.id !== cur[0].p.id || doneRounds(g).length === 1;
  const nr = roundAt(g, r.index + 1),
    nD = g.players[nr.dealerIndex],
    nF = g.players[nr.firstPlayerIndex];
  const tag = nr.cards === g.maxCards ? t.summary.peak : nr.cards === 3 ? t.summary.backTo3 : null;
  return (
    <RoundFrame
      r={r}
      title={t.summary.title(r.index + 1)}
      fit
      aside={
        // On a short one-column screen the card is one line and the table hides; panes always have room.
        <Glass glow spot={false} className="mt-3.5 p-3 pane:mt-0">
          <p className="hidden text-center text-14 leading-[1.4] [text-wrap:balance] @h-[56rem]:block pane:!hidden">
            {t.summary.nextShort(nr.index + 1, nr.cards, nr.trump, nD.name, nF.name)}
          </p>
          <div className="@h-[56rem]:hidden pane:!block">
            <div className="flex items-center justify-between text-13 font-bold uppercase tracking-[0.12em] text-[var(--accent-tx)]">
              <span>{t.summary.nextUp}</span>
              {tag && (
                <span className="rounded-[10px] bg-[var(--gold)] px-2.5 py-0.5 text-13 normal-case tracking-normal text-ink-gold">
                  {tag}
                </span>
              )}
            </div>
            {/* On a phone on its side the card has no height for a table, so it keeps the text only. */}
            <div className="-mx-3 @h-tiny:hidden">
              <div
                className={`mx-auto flex w-full max-w-[20rem] flex-col md:max-w-[22rem] pane:max-w-none ${wide ? 'aspect-[34/30]' : 'aspect-[32/17]'}`}
              >
                <Table
                  uid="sum"
                  fit
                  size={wide ? 'full' : 'mini'}
                  players={g.players}
                  dir={g.direction}
                  dealer={stage >= 5 ? nr.dealerIndex : r.dealerIndex}
                  first={nr.firstPlayerIndex}
                  noSeatAnim
                  center={<SuitCenter trump={nr.trump} cards={nr.cards} card />}
                />
              </div>
            </div>
            <p className="pt-1.5 text-center text-16 leading-[1.45] tracking-[-0.01em]">
              {t.summary.nextLine(nr.index + 1, nr.cards, nr.trump)}
              <br />
              {t.summary.dealsFirst(nD.name, nF.name)}
            </p>
          </div>
        </Glass>
      }
      bar={
        <>
          <PrimaryButton tone="glass" className="px-5" onClick={() => actions.ask('endGame')}>
            {t.summary.endGame}
          </PrimaryButton>
          <PrimaryButton className="flex-1" onClick={actions.nextRound}>
            {t.summary.nextRound}
          </PrimaryButton>
        </>
      }
    >
      {miss && (
        <AllButOne name={miss.name} show={stage >= 1} anim={anim} className="mb-1.5 text-14" />
      )}
      <div
        role="region"
        aria-label={t.summary.standings}
        tabIndex={0}
        className="@container scroll-thin relative min-h-[8.5rem] flex-1 overflow-y-auto overflow-x-hidden"
      >
        {list.map((x) => {
          const id = x.p.id,
            d = r.results[id] ? (pts(r, id) ?? 0) : 0,
            rank = x.rank,
            lead = stage >= 4 && x.rank === 1,
            shown = stage >= 1 && (wait[id] ?? 0) <= landed;
          return (
            <m.div
              layout="position"
              key={id}
              transition={rowMove(climb.length > 0 && anim && !rm)}
              animate={stage === 1 && d < 0 ? shakeKF : undefined}
              className="mb-1.5"
            >
              <Glass
                spot={false}
                className={`relative flex min-h-14 items-center gap-2 overflow-hidden px-2.5 py-1.5 ${lead ? 'ring-1 ring-[color-mix(in_srgb,var(--medal-gold)_55%,transparent)]' : ''}`}
              >
                <div
                  className="disp w-[22px] shrink-0 text-center text-22 font-extrabold"
                  style={{ color: rankColor(rank) }}
                >
                  {rank}
                </div>
                <Avatar
                  p={x.p}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ov/20 text-22"
                />
                <div className="min-w-0 flex-1 break-words text-16 font-bold leading-[1.2] tracking-[-0.015em] [text-wrap:balance] @[26rem]:text-18">
                  {x.p.name}
                  <StreakBadge s={sk[id]} />
                </div>
                <AnimatePresence>
                  {shown && (
                    <m.span
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={SPRING_POP}
                      className={`min-w-10 rounded-xl px-1.5 py-0.5 text-center text-14 font-extrabold @[26rem]:min-w-[46px] @[26rem]:px-2 @[26rem]:text-15 ${d > 0 ? 'bg-[var(--success-soft)] text-[var(--pos)]' : d < 0 ? 'bg-[var(--danger-soft)] text-[var(--neg-tx)]' : 'bg-ov/[.08] text-[var(--tx2)]'}`}
                    >
                      {sgnN(d)}
                    </m.span>
                  )}
                </AnimatePresence>
                {stage === 1 && shown && d > 0 && !rm && <Spark color={palette.positive} />}
                <div className="disp min-w-[3.25rem] text-right text-26 font-extrabold tracking-[-0.03em] @[26rem]:min-w-[70px] @[26rem]:text-28">
                  <Counter from={anim ? pt[id] : ct[id]} to={ct[id]} run={anim && stage >= 2} />
                </div>
                {lead && (
                  <>
                    <m.span
                      initial={changed && anim ? { y: -60, opacity: 0, rotate: -16 } : false}
                      animate={{ y: 0, opacity: 1, rotate: -16 }}
                      transition={SPRING_POP}
                      className="absolute -top-0.5 left-3.5 text-20"
                    >
                      {Icon.crownInline}
                    </m.span>
                    {changed && anim && !rm && (
                      <m.span
                        aria-hidden
                        initial={{ x: '-120%' }}
                        animate={{ x: '120%' }}
                        transition={{ duration: 0.8, ease: EASE }}
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_30%,color-mix(in_srgb,var(--medal-gold-hi)_40%,transparent)_50%,transparent_70%)]"
                      />
                    )}
                  </>
                )}
              </Glass>
            </m.div>
          );
        })}
      </div>
    </RoundFrame>
  );
}
