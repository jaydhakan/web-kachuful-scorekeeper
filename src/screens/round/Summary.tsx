import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { curRound, doneRounds, pts, roundAt, standings, streaks, totals } from '@/domain';
import { sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { palette } from '@/theme/palette';
import { Counter } from '@/components/ui/Counter';
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
  /* The "before" board is frozen when the screen opens so the count-up has something to animate from. */
  /* eslint-disable react-hooks/exhaustive-deps */
  const prevR = useMemo(() => doneRounds(g).filter((x) => x !== r), []);
  const prev = useMemo(() => standings(g, prevR), []);
  const pt = useMemo(() => totals(g, prevR), []);
  /* eslint-enable react-hooks/exhaustive-deps */
  const cur = standings(g),
    ct = totals(g),
    sk = streaks(g);
  const [stage, setStage] = useState(anim ? 0 : 5);
  const rm = useReducedMotion();
  useEffect(() => {
    if (!anim) return;
    const T = rm ? [60, 120, 180, 240, 300] : [350, 1000, 1850, 2450, 3300];
    const ts = T.map((t, i) => setTimeout(() => setStage(i + 1), t));
    const done = setTimeout(() => actions.setSumAnim(false), T[4] + 100);
    return () => {
      ts.forEach(clearTimeout);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one run per mount
  }, []);
  const list = stage >= 3 ? cur : prev;
  const changed = prev[0].p.id !== cur[0].p.id || doneRounds(g).length === 1;
  const nr = roundAt(g, r.index + 1),
    nD = g.players[nr.dealerIndex];
  const tag = nr.cards === g.maxCards ? t.summary.peak : nr.cards === 3 ? t.summary.backTo3 : null;
  return (
    <RoundFrame
      r={r}
      title={t.summary.title(r.index + 1)}
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
      <div className="relative">
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
              className="mb-2"
            >
              <Glass
                spot={false}
                className={`relative flex min-h-16 items-center gap-2.5 overflow-hidden px-3 py-2.5 ${lead ? 'ring-1 ring-[rgba(226,182,83,.55)]' : ''}`}
              >
                <div
                  className="disp w-[30px] shrink-0 text-center text-22 font-extrabold"
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
                <div className="min-w-0 flex-1 truncate text-18 font-bold tracking-[-0.015em]">
                  {x.p.name}
                  {sk[id] >= 3 && <span className="ml-1.5 text-16">🔥{sk[id]}</span>}
                </div>
                <AnimatePresence>
                  {stage >= 1 && (
                    <motion.span
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={SPRING_POP}
                      className={`min-w-[46px] rounded-xl px-2 py-0.5 text-center text-15 font-extrabold ${d > 0 ? 'bg-[rgba(74,222,128,.16)] text-[var(--pos)]' : d < 0 ? 'bg-[rgba(255,92,108,.16)] text-[var(--neg)]' : 'bg-white/[.08] text-[var(--tx2)]'}`}
                    >
                      {sgnN(d)}
                    </motion.span>
                  )}
                </AnimatePresence>
                {stage === 1 && d > 0 && !rm && <Spark color={palette.positive} />}
                <div className="disp min-w-[70px] text-right text-28 font-extrabold tracking-[-0.03em]">
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
      <Glass glow spot={false} className="mt-3.5 p-3">
        <div className="flex items-center justify-between text-13 font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
          <span>{t.summary.nextUp}</span>
          {tag && (
            <span className="rounded-[10px] bg-[var(--gold)] px-2.5 py-0.5 text-13 normal-case tracking-normal text-ink-gold">
              {tag}
            </span>
          )}
        </div>
        <Table
          uid="sum"
          size="mini"
          players={g.players}
          dir={g.direction}
          dealer={stage >= 5 ? nr.dealerIndex : r.dealerIndex}
          first={nr.firstPlayerIndex}
          noSeatAnim
          center={<SuitCenter trump={nr.trump} cards={nr.cards} />}
        />
        <p className="pt-1.5 text-center text-16 leading-[1.45] tracking-[-0.01em]">
          {t.summary.nextLine(nr.index + 1, nr.cards, nr.trump)}
          <br />
          {t.summary.dealsFirst(nD.name, g.players[nr.firstPlayerIndex].name)}
        </p>
      </Glass>
    </RoundFrame>
  );
}
