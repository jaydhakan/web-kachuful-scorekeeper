import { m, useReducedMotion } from 'framer-motion';
import { useRef, useState } from 'react';
import { doneRounds, gameStats, standings, type Player } from '@/games/kachuful/domain';
import { fmt, sgnN } from '@/lib/format';
import { useApp } from '@/games/kachuful/state/store';
import { useDeskKeys } from './useDeskKeys';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SPRING_POP, SPRING_SOFT } from '@/components/ui/motion';
import { DeskPage, GhostButton, Kbd, PageHead, rankTone } from './DeskParts';
import { ChartLegend, ScoreChart } from './ScoreChart';
import {
  AchievementReel,
  LevelUps,
  useGameAchievements,
} from '@/games/kachuful/components/AchievementReel';
import { Sheet } from '@/components/ui/Sheet';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';
import { icon } from '@/components/ui/IconsMore';
import { InkFill } from '@/components/ui/InkFill';
import { Podium } from '@/components/ui/Podium';
import { finalStandings } from '@/games/kachuful/lib/finalStandings';
import { NAME_MS, useReveal } from '@/components/ui/podiumReveal';
import { useFiledAway } from '@/games/kachuful/components/FiledAway';
import { howWon } from '@/games/kachuful/lib/howWon';

const Highlight = ({
  label,
  value,
  tone = '',
  who,
  i,
  wait,
}: {
  label: string;
  value: string;
  tone?: string;
  who: Player;
  i: number;
  /** Seconds before the first card. */
  wait: number;
}) => (
  <m.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ ...SPRING_SOFT, delay: wait + i * 0.08 }}
    className="glass p-3.5"
  >
    <div className="text-13 font-bold text-[var(--tx2)]">{label}</div>
    <div
      className={`disp tick my-1 text-34 font-extrabold leading-none tracking-[-0.03em] ${tone}`}
    >
      {value}
    </div>
    <div className="text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">{who.name}</div>
  </m.div>
);

export function DeskWinner() {
  const { state, actions } = useApp();
  const g = state.game,
    st = standings(g),
    done = doneRounds(g),
    S = gameStats(g),
    rm = useReducedMotion(),
    board = finalStandings(g);
  useDeskKeys({ r: actions.rematch });
  const reel = useGameAchievements(g);
  const [showReel, setShowReel] = useState(false);
  const top = st.filter((x) => x.rank === 1);
  const { play, plan } = useReveal(
    board.map((x) => x.rank),
    state.fresh,
  );
  const how = howWon(
    reel,
    top.map((x) => x.p),
  );
  const headline = useRef<HTMLSpanElement>(null);
  const filed = useFiledAway(g, top[0]?.p);
  // Reopened, the page keeps its own short entrance; just finished, everything follows the winner's name.
  const after = play ? plan.done / 1000 : 0;
  const title =
    top.length > 1
      ? t.desk.winner.tie(top.map((x) => x.p.name).join(', '), fmt(top[0].t))
      : t.desk.winner.title(top[0].p.name, fmt(top[0].t));
  return (
    <DeskPage scroll label={t.winner.finalScores} className="dt:px-12 rail:overflow-hidden">
      <PageHead
        eyebrow={t.desk.winner.eyebrow(done.length)}
        title={
          <>
            <span ref={headline} className="inline-block">
              <InkFill
                text={title}
                fill={play ? { delay: plan.name / 1000, duration: NAME_MS / 1000 } : 'done'}
              />
            </span>
            {how && (
              <m.span
                initial={play ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: after }}
                className="mt-1 block font-sans text-18 font-semibold tracking-normal text-[var(--tx2)]"
              >
                {how}
              </m.span>
            )}
          </>
        }
        actions={
          <>
            {reel.length > 0 && (
              <GhostButton onClick={() => setShowReel(true)}>
                {icon('medal')} {t.hub.game.achievementsN(reel.length)}
              </GhostButton>
            )}
            <GhostButton onClick={() => actions.openSheet({ type: 'share' })}>
              {Icon.share}
              {t.winner.share}
            </GhostButton>
            <GhostButton
              onClick={() => {
                filed.file(headline.current);
                actions.go('home', -1);
              }}
            >
              {t.common.home}
            </GhostButton>
            <PrimaryButton
              className="!h-12 !rounded-[14px] px-5 !text-16"
              onClick={actions.rematch}
            >
              {t.winner.rematch} <Kbd>R</Kbd>
            </PrimaryButton>
          </>
        }
      />
      <div className="grid gap-5 rail:min-h-0 rail:flex-1 tl:grid-cols-[minmax(0,1fr)_clamp(20rem,38vw,26rem)] dt:grid-cols-[minmax(0,1fr)_clamp(28rem,36vw,32.5rem)] dt:gap-10">
        <section
          aria-label={t.winner.finalScores}
          className="glass glass-glow cq-size relative flex h-[28rem] flex-col items-center justify-end overflow-hidden px-6 pt-8 rail:h-auto dt:px-10"
        >
          <m.span
            initial={rm || !play ? false : { y: -120, scale: 0.4, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ ...SPRING_POP, delay: after }}
            role="img"
            aria-label={t.desk.winner.trophy}
            className="absolute left-1/2 top-7 h-[min(84px,12cqh)] w-[min(84px,12cqh)] -translate-x-1/2 text-gold [filter:drop-shadow(0_0_24px_color-mix(in_srgb,var(--medal-gold)_60%,transparent))]"
          >
            {Icon.trophy}
          </m.span>
          <Podium look="desk" standings={board} reveal={play ? plan : null} />
        </section>
        <aside className="flex min-h-0 flex-col gap-4">
          <ol
            aria-label={t.desk.winner.ranking}
            className="glass scroll-thin flex shrink-0 flex-col gap-1 p-3.5 rail:max-h-[45%] rail:overflow-y-auto"
          >
            {st.map((x, i) => (
              <m.li
                key={x.p.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING_SOFT, delay: (play ? after + 0.1 : 0.3) + i * 0.04 }}
                className="flex min-h-14 items-center gap-3 px-2.5"
              >
                <span className={`disp w-8 text-center text-22 font-extrabold ${rankTone(x.rank)}`}>
                  {x.rank}
                </span>
                <Avatar
                  p={x.p}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ov/20 text-22"
                />
                <span className="min-w-0 flex-1 text-18 font-bold [overflow-wrap:anywhere]">
                  {x.p.name}
                </span>
                <span
                  className={`disp tick text-28 font-extrabold ${x.t < 0 ? 'text-[var(--neg-tx)]' : ''}`}
                >
                  {fmt(x.t)}
                </span>
              </m.li>
            ))}
          </ol>
          {done.length > 0 && (
            <>
              <h2 className="disp text-22 font-extrabold tracking-[-0.03em]">
                {t.winner.highlights}
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <Highlight
                  wait={play ? after + 0.4 : 1.1}
                  i={0}
                  label={t.desk.winner.mostExact}
                  value={t.desk.winner.exactOf(S.sharp.exact, done.length)}
                  who={S.sharp.p}
                />
                <Highlight
                  wait={play ? after + 0.4 : 1.1}
                  i={1}
                  label={t.desk.winner.biggestRound}
                  value={sgnN(S.big.best)}
                  tone="text-[var(--pos)]"
                  who={S.big.p}
                />
                <Highlight
                  wait={play ? after + 0.4 : 1.1}
                  i={2}
                  label={t.desk.winner.biggestMiss}
                  value={sgnN(S.ouch.worst)}
                  tone={S.ouch.worst < 0 ? 'text-[var(--neg-tx)]' : ''}
                  who={S.ouch.p}
                />
              </div>
              <div className="glass flex min-h-[13rem] flex-1 flex-col gap-1.5 px-5 pb-2 pt-3.5">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <h2 className="disp text-18 font-extrabold">{t.desk.summary.history}</h2>
                  <ChartLegend g={g} />
                </div>
                <ScoreChart g={g} rounds={done} />
              </div>
            </>
          )}
        </aside>
      </div>
      {showReel && (
        <Sheet
          title={t.hub.game.achievements}
          roomy="panel"
          full
          onClose={() => setShowReel(false)}
        >
          <AchievementReel g={g} max={40} />
          <LevelUps g={g} heading="disp mb-2 mt-6 text-22 font-extrabold tracking-[-0.03em]" />
        </Sheet>
      )}
      {filed.node}
    </DeskPage>
  );
}
