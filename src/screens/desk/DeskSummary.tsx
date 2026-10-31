import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { currentStreaks, curRound, doneRounds, pts, roundAt, standings, totals } from '@/domain';
import { useApp } from '@/state/store';
import { useDeskKeys } from './useDeskKeys';
import { Counter } from '@/components/ui/Counter';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table } from '@/components/ui/Table';
import { EASE, SPRING_POP } from '@/components/ui/motion';
import { shakeKF } from '@/components/ui/stagger';
import { ComingUp } from './ComingUp';
import { DeskPage, Delta, Eyebrow, GhostButton, Kbd, PageHead, rankTone } from './DeskParts';
import { ChartLegend, ScoreChart } from './ScoreChart';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';

/** After a round: the standings move into place, the totals count up, and the next round is laid out on the right. */
export function DeskSummary() {
  const { state, actions } = useApp();
  const g = state.game,
    r = curRound(g),
    anim = state.sumAnim,
    rm = useReducedMotion();
  // The "before" board is frozen when the screen opens so the count-up has something to animate from.
  /* eslint-disable react-hooks/exhaustive-deps */
  const prevR = useMemo(() => doneRounds(g).filter((x) => x !== r), []);
  const prev = useMemo(() => standings(g, prevR), []);
  const pt = useMemo(() => totals(g, prevR), []);
  /* eslint-enable react-hooks/exhaustive-deps */
  const cur = standings(g),
    ct = totals(g),
    sk = currentStreaks(g),
    done = doneRounds(g);
  const [stage, setStage] = useState(anim ? 0 : 5);
  // A streak celebration plays first; the count-up waits for it.
  const celebrating = !!state.streakFx;
  useEffect(() => {
    if (!anim || celebrating) return;
    const T = rm ? [60, 120, 180, 240, 300] : [300, 900, 1700, 2300, 3000];
    const ts = T.map((ms, i) => setTimeout(() => setStage(i + 1), ms));
    const end = setTimeout(() => actions.setSumAnim(false), T[4] + 100);
    return () => {
      ts.forEach(clearTimeout);
      clearTimeout(end);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one run, once nothing plays over the screen
  }, [celebrating]);
  useDeskKeys({ enter: actions.nextRound });
  const list = stage >= 3 ? cur : prev;
  const before = Object.fromEntries(prev.map((x) => [x.p.id, x.rank]));
  const newLead = prevR.length > 0 && prev[0].p.id !== cur[0].p.id;
  const nr = roundAt(g, r.index + 1),
    nD = g.players[nr.dealerIndex],
    nF = g.players[nr.firstPlayerIndex];
  const tag = nr.cards === g.maxCards ? t.summary.peak : nr.cards === 3 ? t.summary.backTo3 : null;
  return (
    <DeskPage scroll label={t.summary.title(r.index + 1)} className="rail:overflow-hidden">
      <PageHead
        barTitled
        eyebrow={t.desk.summary.eyebrow(r.index + 1)}
        title={t.summary.title(r.index + 1)}
        actions={
          <>
            <GhostButton disabled={!state.undo.length} onClick={actions.undo}>
              {Icon.undo}
              {t.desk.nav.undo} <Kbd className="bg-white/[.12]">Z</Kbd>
            </GhostButton>
            <GhostButton onClick={() => actions.openSheet({ type: 'board' })}>
              {t.desk.summary.full}
            </GhostButton>
          </>
        }
      />
      <div className="grid min-h-0 flex-1 gap-4 tp:grid-rows-[minmax(0,1fr)_auto] tl:grid-cols-[minmax(0,1fr)_clamp(20rem,36vw,25rem)] tl:gap-5 dt:grid-cols-[minmax(0,1fr)_clamp(26rem,36vw,32.5rem)] dt:gap-6">
        <section className="flex min-h-0 flex-col gap-4">
          <ol
            aria-label={t.summary.standings}
            className="glass scroll-thin flex shrink-0 flex-col gap-1.5 overflow-y-auto p-3 tp:max-h-[55%] rail:max-h-[60%]"
          >
            {list.map((x) => {
              const id = x.p.id,
                d = r.results[id] ? (pts(r, id) ?? 0) : 0,
                lead = stage >= 4 && x.rank === 1,
                move = before[id] - (cur.find((c) => c.p.id === id)?.rank ?? 0),
                showMove = stage >= 3;
              return (
                <motion.li
                  layout="position"
                  key={id}
                  transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                  animate={stage === 1 && d < 0 ? shakeKF : undefined}
                  className={`relative flex min-h-14 items-center gap-3 overflow-hidden rounded-2xl py-1 pl-1.5 pr-3.5 dt:min-h-16 dt:gap-3.5 ${lead ? 'bg-[rgba(226,182,83,.10)] shadow-[inset_0_0_0_1px_rgba(226,182,83,.5)]' : ''}`}
                >
                  <span
                    className={`disp w-8 shrink-0 text-center text-22 font-extrabold ${rankTone(x.rank)}`}
                  >
                    {x.rank}
                  </span>
                  <span className="grid w-[26px] shrink-0 place-items-center">
                    <AnimatePresence>
                      {lead && (
                        <motion.span
                          aria-label={t.desk.scores.leader}
                          role="img"
                          initial={
                            newLead && anim && !rm ? { y: -40, opacity: 0, rotate: -20 } : false
                          }
                          animate={{ y: 0, opacity: 1, rotate: 0 }}
                          transition={SPRING_POP}
                        >
                          {Icon.crown}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  <Avatar
                    p={x.p}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white/20 text-22 shadow-[0_8px_22px_rgba(0,0,0,.45)] dt:h-12 dt:w-12 dt:text-26"
                  />
                  <span className="min-w-0 flex-1 text-20 font-bold leading-tight tracking-[-0.015em] [overflow-wrap:anywhere] dt:text-24">
                    {x.p.name}
                    <StreakBadge s={sk[id]} />
                  </span>
                  <span
                    className={`hidden w-[5.5rem] shrink-0 text-14 font-bold rail:block ${move > 0 ? 'text-[var(--pos)]' : move < 0 ? 'text-[var(--neg-tx)]' : 'text-[var(--tx2)]'} ${showMove ? '' : 'opacity-0'}`}
                  >
                    {x.rank === 1 && move === 0
                      ? t.desk.scores.holdsFirst
                      : x.rank === 1 && newLead
                        ? t.desk.scores.newLeader
                        : move > 0
                          ? t.desk.scores.up(move)
                          : move < 0
                            ? t.desk.scores.down(-move)
                            : t.desk.scores.holds}
                  </span>
                  <span className="w-[52px] shrink-0">{stage >= 1 && <Delta v={d} />}</span>
                  <span
                    className={`disp tick w-[4.5rem] shrink-0 text-right text-32 font-extrabold tracking-[-0.03em] dt:w-[5.25rem] dt:text-40 ${ct[id] < 0 ? 'text-[var(--neg-tx)]' : ''}`}
                  >
                    <Counter from={anim ? pt[id] : ct[id]} to={ct[id]} run={anim && stage >= 2} />
                  </span>
                  {lead && newLead && anim && !rm && (
                    <motion.span
                      aria-hidden
                      initial={{ x: '-120%' }}
                      animate={{ x: '120%' }}
                      transition={{ duration: 0.9, ease: EASE }}
                      className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_30%,rgba(247,231,166,.35)_50%,transparent_70%)]"
                    />
                  )}
                </motion.li>
              );
            })}
          </ol>
          <div className="glass flex min-h-[9rem] flex-1 flex-col gap-2 px-6 pb-3 pt-4 rail:min-h-[15rem]">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h2 className="disp text-20 font-extrabold tracking-[-0.02em]">
                {t.desk.summary.history}
              </h2>
              <ChartLegend g={g} />
            </div>
            <ScoreChart g={g} rounds={done} />
          </div>
        </section>
        <aside className="glass glass-glow grid gap-x-5 gap-y-3.5 p-5 tp:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] rail:flex rail:min-h-0 rail:flex-col dt:p-6">
          <div className="flex items-center justify-between gap-3 tp:col-span-2">
            <Eyebrow>{t.summary.nextUp}</Eyebrow>
            {tag && (
              <span className="rounded-xl bg-[var(--gold)] px-2.5 py-0.5 text-13 font-extrabold text-ink-gold">
                {tag}
              </span>
            )}
          </div>
          <div className="flex h-[12rem] flex-col rail:h-auto rail:min-h-[12rem] rail:flex-1">
            <Table
              uid="dsum"
              size="wide"
              fit
              minFit={0.5}
              noSeatAnim
              players={g.players}
              dir={g.direction}
              dealer={stage >= 5 ? nr.dealerIndex : r.dealerIndex}
              first={nr.firstPlayerIndex}
              center={<SuitCenter trump={nr.trump} cards={nr.cards} />}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-3.5 rail:contents">
            <p className="text-18 leading-[1.45] dt:text-20">
              {t.desk.summary.nextLine(nr.index + 1, nr.cards, nr.trump)}
              <br />
              {t.desk.summary.dealsFirst(nD.name, nF.name)}
            </p>
            <div className="hidden dt:block">
              <ComingUp g={g} from={nr.index} count={3} bare />
            </div>
            <div className="mt-auto flex gap-3">
              <PrimaryButton tone="glass" className="px-6" onClick={() => actions.ask('endGame')}>
                {t.summary.endGame}
              </PrimaryButton>
              <PrimaryButton className="flex-1" onClick={actions.nextRound}>
                {t.summary.nextRound} <Kbd>⏎</Kbd>
              </PrimaryButton>
            </div>
          </div>
        </aside>
      </div>
    </DeskPage>
  );
}
