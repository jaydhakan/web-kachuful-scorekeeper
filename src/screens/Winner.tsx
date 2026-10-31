import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { gameStats, standings, type Player } from '@/domain';
import { fmt, sgnN, trunc } from '@/lib/format';
import { useApp } from '@/state/store';
import { palette } from '@/theme/palette';
import { Dot } from '@/components/ui/Dot';
import { Glass } from '@/components/ui/Glass';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Scaffold } from '@/components/ui/Scaffold';
import { EASE, SPRING_POP, SPRING_SOFT } from '@/components/ui/motion';
import { t } from '@/strings';

const rankColor = (rank: number) =>
  rank === 1
    ? palette.gold
    : rank === 2
      ? palette['rank-silver']
      : rank === 3
        ? palette['rank-bronze']
        : 'var(--tx)';

const PODIUM_BG = {
  1: 'bg-gold-gradient-v',
  2: 'bg-silver-gradient-v',
  3: 'bg-bronze-gradient-v',
} as const;

// Podium sizes in design pixels times --pu, which is 1px except on a short screen where the podium shrinks to fit.
const AVATAR = {
  1: { w: 'max(2rem, calc(64 * var(--pu)))' },
  2: { w: 'max(1.75rem, calc(52 * var(--pu)))' },
  3: { w: 'max(1.75rem, calc(52 * var(--pu)))' },
} as const;
const STEP_MIN = '3rem';

interface StatCardProps {
  ic: string;
  t: string;
  p: Player;
  s: ReactNode;
  i: number;
}

const StatCard = ({ ic, t, p, s, i }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ ...SPRING_SOFT, delay: (i % 2) * 0.06 }}
  >
    <Glass className="h-full p-3">
      <div className="text-13 font-bold text-[var(--tx2)]">
        {ic} {t}
      </div>
      <div className="disp mt-1 flex items-start gap-1.5 text-20 font-extrabold tracking-[-0.025em]">
        <Dot p={p} s={24} />
        <span className="min-w-0 [overflow-wrap:anywhere]">{p.name}</span>
      </div>
      <div className="text-13 text-[var(--tx2)]">{s}</div>
    </Glass>
  </motion.div>
);

// Two panes (short screens) and the wide layout share one centred 72rem frame, like every other screen.
const PANE_GUTTERS =
  'pane:pl-[max(var(--sal),calc((100%-72rem)/2))] pane:pr-[max(var(--sar),calc((100%-72rem)/2))]';

export default function Winner() {
  const { state, actions } = useApp();
  const g = state.game,
    st = standings(g),
    S = gameStats(g);
  const col = (k: 1 | 2 | 3) => {
    const m = st.filter((x) => x.rank === k),
      h = k === 1 ? 128 : k === 2 ? 96 : 76;
    return (
      <div
        key={k}
        className="flex max-w-[120px] flex-1 flex-col items-center justify-end wide:max-w-[9rem]"
      >
        <div className="mb-1.5 flex flex-wrap justify-center gap-1.5">
          {m.map((x, i) => (
            <motion.div
              key={x.p.id}
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...SPRING_POP, delay: 0.9 + (3 - k) * 0.12 + i * 0.05 }}
              // The name is shortened to fit the column; the full one is the accessible name and the tooltip.
              role="group"
              aria-label={x.p.name}
              title={x.p.name}
              className="flex max-w-[70px] flex-col items-center text-13 font-bold wide:max-w-[7rem]"
            >
              <span
                aria-hidden
                className={`grid place-items-center rounded-full border-2 ${k === 1 ? 'border-gold text-36 shadow-[0_0_28px_rgba(226,182,83,.6)] land:text-22' : 'border-white/25 text-28 land:text-19'}`}
                style={{
                  background: x.p.color,
                  width: AVATAR[k].w,
                  height: AVATAR[k].w,
                }}
              >
                {x.p.emoji}
              </span>
              <span aria-hidden>{trunc(x.p.name)}</span>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: (3 - k) * 0.15 }}
          style={{
            height: `max(${STEP_MIN}, calc(${h} * var(--pu)))`,
            originY: 1,
            opacity: m.length ? 1 : 0.25,
          }}
          className={`disp flex w-full flex-col items-center rounded-t-2xl pt-2 text-32 land:text-22 land:leading-none font-extrabold text-ink-podium shadow-[0_20px_50px_-16px_rgba(0,0,0,.7)] ${PODIUM_BG[k]}`}
        >
          {k === 1 ? t.winner.first : k === 2 ? t.winner.second : t.winner.third}
          <small className="font-sans text-13 font-bold land:mt-1">
            {m.length ? sgnN(m[0].t) : '—'}
          </small>
        </motion.div>
      </div>
    );
  };
  return (
    <Scaffold
      left={
        <IconButton label={t.common.home} onClick={() => actions.go('home', -1)}>
          {Icon.back}
        </IconButton>
      }
      navTitle={t.winner.finalScores}
      className={PANE_GUTTERS}
      bar={
        // The buttons sit under the right-hand pane when short, and never stretch past 26rem on wide screens.
        <div className="flex w-full gap-3 land:ml-auto land:w-[clamp(17rem,44vw,23rem)] md:mx-auto md:max-w-[26rem] wide:mx-auto wide:max-w-[26rem]">
          <PrimaryButton
            tone="glass"
            className="gap-2 px-5"
            onClick={() => actions.openSheet({ type: 'share' })}
          >
            {Icon.share} {t.winner.share}
          </PrimaryButton>
          <PrimaryButton className="flex-1" onClick={actions.rematch}>
            {t.winner.rematch}
          </PrimaryButton>
        </div>
      }
    >
      <div className="land:grid land:h-full land:grid-rows-[minmax(0,1fr)] land:grid-cols-[minmax(0,1fr)_clamp(17rem,44vw,23rem)] land:gap-x-5 wide:grid wide:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] wide:gap-x-10">
        <div
          role="region"
          // Ties stack more avatars than the design height allows, so this pane scrolls rather than clipping.
          tabIndex={0}
          aria-label={t.winner.finalScores}
          className="scroll-thin land:flex land:min-h-0 land:overflow-x-hidden land:overflow-y-auto land:cq-size wide:[grid-area:1/1]"
        >
          <div className="[--pu:1px] land:m-auto land:[--pu:min(1px,calc(100cqh/340))]">
            <motion.span
              aria-hidden
              initial={{ y: -140, scale: 0.5, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ ...SPRING_POP, delay: 0.5 }}
              className="block text-center text-52 land:hidden"
            >
              🏆
            </motion.span>
            <div
              data-podium
              className="mb-4 mt-2 flex min-h-[240px] items-end justify-center gap-2 land:mb-0 land:mt-0 land:min-h-0"
            >
              {([2, 1, 3] as const).map(col)}
            </div>
          </div>
        </div>
        <div
          tabIndex={0}
          role="region"
          aria-label={t.winner.rankingRegion}
          className="scroll-thin @container land:min-h-0 land:overflow-y-auto land:overflow-x-hidden land:overscroll-contain wide:contents"
        >
          <div className="wide:[grid-area:1/2]">
            {st.map((x, i) => (
              <motion.div
                key={x.p.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...SPRING_SOFT, delay: i * 0.03 }}
                className="mb-2"
              >
                <Glass spot={false} className="flex min-h-14 items-center gap-2.5 px-3 py-2">
                  <div
                    className="disp w-[30px] text-center text-22 font-extrabold"
                    style={{ color: rankColor(x.rank) }}
                  >
                    {x.rank}
                  </div>
                  <Dot p={x.p} s={40} />
                  <div className="min-w-0 flex-1 text-18 land:text-16 font-bold tracking-[-0.015em] [overflow-wrap:anywhere] [text-wrap:balance]">
                    {x.p.name}
                  </div>
                  <div
                    className={`disp text-26 land:text-22 font-extrabold tracking-[-0.03em] ${x.t < 0 ? 'text-[var(--neg)]' : ''}`}
                  >
                    {fmt(x.t)}
                  </div>
                </Glass>
              </motion.div>
            ))}
          </div>
          <div className="wide:[grid-area:2/1/3/3]">
            <h2 className="disp mb-2 mt-6 text-22 font-extrabold tracking-[-0.03em]">
              {t.winner.highlights}
            </h2>
            <div className="grid grid-cols-2 gap-2.5 land:grid-cols-1 land:@[22rem]:grid-cols-2 md:grid-cols-3 wide:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
              <StatCard
                i={0}
                ic="🎯"
                t={t.winner.sharp}
                p={S.sharp.p}
                s={t.winner.exactBids(S.sharp.exact)}
              />
              <StatCard
                i={1}
                ic="💥"
                t={t.winner.big}
                p={S.big.p}
                s={t.winner.inOneRound(sgnN(S.big.best))}
              />
              <StatCard
                i={2}
                ic="🔥"
                t={t.winner.streak}
                p={S.streak.p}
                s={t.winner.exactInRow(S.streak.maxRun)}
              />
              <StatCard
                i={3}
                ic="🪝"
                t={t.winner.hook}
                p={S.hook.p}
                s={t.winner.blocked(S.hook.hook)}
              />
              <StatCard
                i={4}
                ic="😬"
                t={t.winner.ouch}
                p={S.ouch.p}
                s={t.winner.inOneRound(sgnN(S.ouch.worst))}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-center wide:[grid-area:3/1/4/3]">
            <button
              type="button"
              onClick={() => actions.go('home', -1)}
              className="min-h-12 px-4 text-16 font-medium text-[var(--tx2)] underline decoration-white/25 underline-offset-[5px]"
            >
              {t.common.home}
            </button>
          </div>
        </div>
      </div>
    </Scaffold>
  );
}
