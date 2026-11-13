import { m } from 'framer-motion';
import { useRef, type ReactNode } from 'react';
import { doneRounds, gameStats, standings, type Player } from '@/games/kachuful/domain';
import {
  AchievementReel,
  LevelUps,
  useGameAchievements,
} from '@/games/kachuful/components/AchievementReel';
import { LazyChart } from '@/games/kachuful/components/LazyChart';
import { fmt, sgnN } from '@/lib/format';
import { useApp } from '@/games/kachuful/state/store';
import { palette } from '@/theme/palette';
import { Dot } from '@/components/ui/Dot';
import { Glass } from '@/components/ui/Glass';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Scaffold } from '@/components/ui/Scaffold';
import { SPRING_POP, SPRING_SOFT } from '@/components/ui/motion';
import { Podium } from '@/components/ui/Podium';
import { finalStandings } from '@/games/kachuful/lib/finalStandings';
import { t } from '@/strings';
import { icon } from '@/components/ui/IconsMore';
import { InkFill } from '@/components/ui/InkFill';
import { NAME_MS, useReveal } from '@/components/ui/podiumReveal';
import { useFiledAway } from '@/games/kachuful/components/FiledAway';
import { howWon } from '@/games/kachuful/lib/howWon';

const rankColor = (rank: number) =>
  rank === 1
    ? palette.gold
    : rank === 2
      ? palette['rank-silver']
      : rank === 3
        ? palette['rank-bronze']
        : 'var(--tx)';

interface StatCardProps {
  ic: ReactNode;
  t: string;
  p: Player;
  s: ReactNode;
  i: number;
  /** Seconds to hold back while the reveal above is still running. */
  wait: number;
}

const StatCard = ({ ic, t, p, s, i, wait }: StatCardProps) => (
  <m.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ ...SPRING_SOFT, delay: wait + (i % 2) * 0.06 }}
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
  </m.div>
);

// Two panes (short screens) and the wide layout share one centred 72rem frame, like every other screen.
const PANE_GUTTERS =
  'pane:pl-[max(var(--sal),calc((100%-72rem)/2))] pane:pr-[max(var(--sar),calc((100%-72rem)/2))]';

export default function Winner() {
  const { state, actions } = useApp();
  const g = state.game,
    st = standings(g),
    S = gameStats(g),
    done = doneRounds(g);
  const reel = useGameAchievements(g);
  const board = finalStandings(g);
  const top = st.filter((x) => x.rank === 1).map((x) => x.p);
  const { play, plan, named } = useReveal(
    board.map((x) => x.rank),
    state.fresh,
  );
  const how = howWon(reel, top);
  const headline = useRef<HTMLHeadingElement>(null);
  const filed = useFiledAway(g, top[0]);
  const home = () => {
    filed.file(headline.current);
    actions.go('home', -1);
  };
  // The trophy, rows and cards follow the name; once it is in, anything scrolled into view comes straight away.
  const after = named ? 0 : plan.done / 1000;
  return (
    <Scaffold
      left={
        <IconButton label={t.common.home} onClick={home}>
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
            <m.span
              aria-hidden
              initial={play ? { y: -140, scale: 0.5, opacity: 0 } : false}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ ...SPRING_POP, delay: after }}
              className="mx-auto block h-[3.25rem] w-[3.25rem] text-[var(--gold-tx)] land:hidden"
            >
              {icon('trophy', 'h-full w-full')}
            </m.span>
            <h2
              ref={headline}
              className="framed disp mt-1 text-center text-28 font-extrabold leading-tight [overflow-wrap:anywhere] land:hidden"
            >
              <InkFill
                text={t.winner.headline(top.map((p) => p.name))}
                fill={play ? { delay: plan.name / 1000, duration: NAME_MS / 1000 } : 'done'}
              />
              {/* Part of the heading, so it is read with the name. */}
              {how && (
                <m.span
                  initial={play ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: after }}
                  className="mt-0.5 block font-sans text-15 font-semibold tracking-normal text-[var(--tx2)]"
                >
                  {how}
                </m.span>
              )}
            </h2>
            <Podium standings={board} reveal={play ? plan : null} />
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
              <m.div
                key={x.p.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...SPRING_SOFT, delay: after + i * 0.03 }}
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
              </m.div>
            ))}
          </div>
          <div className="wide:[grid-area:2/1/3/3]">
            <h2 className="disp mb-2 mt-6 text-22 font-extrabold tracking-[-0.03em]">
              {t.winner.highlights}
            </h2>
            <div className="grid grid-cols-2 gap-2.5 land:grid-cols-1 land:@[22rem]:grid-cols-2 md:grid-cols-3 wide:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
              <StatCard
                wait={after}
                i={0}
                ic={icon('target')}
                t={t.winner.sharp}
                p={S.sharp.p}
                s={t.winner.exactBids(S.sharp.exact)}
              />
              <StatCard
                wait={after}
                i={1}
                ic={icon('bolt')}
                t={t.winner.big}
                p={S.big.p}
                s={t.winner.inOneRound(sgnN(S.big.best))}
              />
              <StatCard
                wait={after}
                i={2}
                ic={icon('fire')}
                t={t.winner.streak}
                p={S.streak.p}
                s={t.winner.exactInRow(S.streak.maxRun)}
              />
              <StatCard
                wait={after}
                i={3}
                ic={icon('hook')}
                t={t.winner.hook}
                p={S.hook.p}
                s={t.winner.blocked(S.hook.hook)}
              />
              <StatCard
                wait={after}
                i={4}
                ic={icon('nervous')}
                t={t.winner.ouch}
                p={S.ouch.p}
                s={t.winner.inOneRound(sgnN(S.ouch.worst))}
              />
            </div>
          </div>
          <div className="wide:[grid-area:3/1/4/3]">
            {reel.length > 0 && (
              <>
                <h2 className="disp mb-2 mt-6 text-22 font-extrabold tracking-[-0.03em]">
                  {t.hub.game.achievements}
                </h2>
                <AchievementReel g={g} />
              </>
            )}
            <LevelUps g={g} heading="disp mb-2 mt-6 text-22 font-extrabold tracking-[-0.03em]" />
            {done.length > 1 && (
              <>
                <h2 className="disp mb-2 mt-6 text-22 font-extrabold tracking-[-0.03em]">
                  {t.hub.game.chart}
                </h2>
                <Glass spot={false} className="p-4">
                  <LazyChart g={g} rounds={done} />
                </Glass>
              </>
            )}
          </div>
          <div className="mt-4 flex justify-center wide:[grid-area:4/1/5/3]">
            <button
              type="button"
              onClick={home}
              className="press min-h-12 px-4 text-16 font-medium text-[var(--tx2)] underline decoration-ov/25 underline-offset-[5px]"
            >
              {t.common.home}
            </button>
          </div>
        </div>
      </div>
      {filed.node}
    </Scaffold>
  );
}
