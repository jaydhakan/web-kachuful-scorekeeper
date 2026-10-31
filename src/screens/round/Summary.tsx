import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { currentStreaks, curRound, doneRounds, pts, roundAt, standings, totals } from '@/domain';
import { sgnN } from '@/lib/format';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useApp } from '@/state/store';
import { palette } from '@/theme/palette';
import { MQ } from '@/theme/breakpoints';
import { Counter } from '@/components/ui/Counter';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { Glass } from '@/components/ui/Glass';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table } from '@/components/ui/Table';
import { EASE, SPRING_POP } from '@/components/ui/motion';
import { shakeKF } from '@/components/ui/stagger';
import { RoundFrame } from './RoundFrame';
import { t } from '@/strings';

function Spark({ color }: { color: string }) {
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2,
          d = 26 + (i % 3) * 8;
        return (
          <motion.i
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
  const [stage, setStage] = useState(anim ? 0 : 5);
  const rm = useReducedMotion();
  // A streak celebration plays first; the count-up waits for it.
  const celebrating = !!state.streakFx;
  useEffect(() => {
    if (!anim || celebrating) return;
    const T = rm ? [60, 120, 180, 240, 300] : [350, 1000, 1850, 2450, 3300];
    const ts = T.map((t, i) => setTimeout(() => setStage(i + 1), t));
    const done = setTimeout(() => actions.setSumAnim(false), T[4] + 100);
    return () => {
      ts.forEach(clearTimeout);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one run, once nothing plays over the screen
  }, [celebrating]);
  const list = stage >= 3 ? cur : prev;
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
            <div className="flex items-center justify-between text-13 font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
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
                  center={<SuitCenter trump={nr.trump} cards={nr.cards} />}
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
            lead = stage >= 4 && x.rank === 1;
          return (
            <motion.div
              layout="position"
              key={id}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              animate={stage === 1 && d < 0 ? shakeKF : undefined}
              className="mb-1.5"
            >
              <Glass
                spot={false}
                className={`relative flex min-h-14 items-center gap-2 overflow-hidden px-2.5 py-1.5 ${lead ? 'ring-1 ring-[rgba(226,182,83,.55)]' : ''}`}
              >
                <div
                  className="disp w-[22px] shrink-0 text-center text-22 font-extrabold"
                  style={{ color: rankColor(rank) }}
                >
                  {rank}
                </div>
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white/20 text-22"
                  style={{ background: x.p.color }}
                >
                  {x.p.emoji}
                </div>
                <div className="min-w-0 flex-1 break-words text-16 font-bold leading-[1.2] tracking-[-0.015em] [text-wrap:balance] @[26rem]:text-18">
                  {x.p.name}
                  <StreakBadge s={sk[id]} />
                </div>
                <AnimatePresence>
                  {stage >= 1 && (
                    <motion.span
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={SPRING_POP}
                      className={`min-w-10 rounded-xl px-1.5 py-0.5 text-center text-14 font-extrabold @[26rem]:min-w-[46px] @[26rem]:px-2 @[26rem]:text-15 ${d > 0 ? 'bg-[rgba(74,222,128,.16)] text-[var(--pos)]' : d < 0 ? 'bg-[rgba(255,92,108,.16)] text-[var(--neg-tx)]' : 'bg-white/[.08] text-[var(--tx2)]'}`}
                    >
                      {sgnN(d)}
                    </motion.span>
                  )}
                </AnimatePresence>
                {stage === 1 && d > 0 && !rm && <Spark color={palette.positive} />}
                <div className="disp min-w-[3.25rem] text-right text-26 font-extrabold tracking-[-0.03em] @[26rem]:min-w-[70px] @[26rem]:text-28">
                  <Counter from={anim ? pt[id] : ct[id]} to={ct[id]} run={anim && stage >= 2} />
                </div>
                {lead && (
                  <>
                    <motion.span
                      initial={changed && anim ? { y: -60, opacity: 0, rotate: -16 } : false}
                      animate={{ y: 0, opacity: 1, rotate: -16 }}
                      transition={SPRING_POP}
                      className="absolute -top-0.5 left-3.5 text-20"
                    >
                      👑
                    </motion.span>
                    {changed && anim && !rm && (
                      <motion.span
                        aria-hidden
                        initial={{ x: '-120%' }}
                        animate={{ x: '120%' }}
                        transition={{ duration: 0.8, ease: EASE }}
                        className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_30%,rgba(247,231,166,.4)_50%,transparent_70%)]"
                      />
                    )}
                  </>
                )}
              </Glass>
            </motion.div>
          );
        })}
      </div>
    </RoundFrame>
  );
}
