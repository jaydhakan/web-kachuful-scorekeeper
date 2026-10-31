import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { doneRounds, gameStats, standings, type Player } from '@/domain';
import { fmt, sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { useDeskKeys } from './useDeskKeys';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EASE, SPRING_POP, SPRING_SOFT } from '@/components/ui/motion';
import { DeskPage, GhostButton, Kbd, PageHead, rankTone } from './DeskParts';
import { ChartLegend, ScoreChart } from './ScoreChart';
import { AchievementReel, useGameAchievements } from '@/components/AchievementReel';
import { Sheet } from '@/components/ui/Sheet';
import { t } from '@/strings';
import { Avatar, AvatarFill } from '@/components/ui/Avatar';

const STEP = {
  1: {
    h: 'h-[min(310px,42cqh)]',
    bg: 'bg-gold-gradient-v',
    text: 'text-64',
    av: 104,
    ring: 'border-gold shadow-[0_0_44px_rgba(226,182,83,.6)]',
  },
  2: {
    h: 'h-[min(230px,31cqh)]',
    bg: 'bg-silver-gradient-v',
    text: 'text-48',
    av: 72,
    ring: 'border-rank-silver',
  },
  3: {
    h: 'h-[min(170px,23cqh)]',
    bg: 'bg-bronze-gradient-v',
    text: 'text-44',
    av: 72,
    ring: 'border-rank-bronze',
  },
} as const;

const Highlight = ({
  label,
  value,
  tone = '',
  who,
  i,
}: {
  label: string;
  value: string;
  tone?: string;
  who: Player;
  i: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ ...SPRING_SOFT, delay: 1.1 + i * 0.08 }}
    className="glass p-3.5"
  >
    <div className="text-13 font-bold text-[var(--tx2)]">{label}</div>
    <div
      className={`disp tick my-1 text-34 font-extrabold leading-none tracking-[-0.03em] ${tone}`}
    >
      {value}
    </div>
    <div className="text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">{who.name}</div>
  </motion.div>
);

export function DeskWinner() {
  const { state, actions } = useApp();
  const g = state.game,
    st = standings(g),
    done = doneRounds(g),
    S = gameStats(g),
    rm = useReducedMotion();
  useDeskKeys({ r: actions.rematch });
  const reel = useGameAchievements(g);
  const [showReel, setShowReel] = useState(false);
  const top = st.filter((x) => x.rank === 1);
  const title =
    top.length > 1
      ? t.desk.winner.tie(top.map((x) => x.p.name).join(', '), fmt(top[0].t))
      : t.desk.winner.title(top[0].p.name, fmt(top[0].t));
  const col = (k: 1 | 2 | 3) => {
    const m = st.filter((x) => x.rank === k),
      s = STEP[k];
    return (
      <div key={k} className="flex min-w-0 flex-1 flex-col items-center justify-end">
        <div className="mb-2.5 flex flex-wrap justify-center gap-2">
          {m.map((x, i) => (
            <motion.div
              key={x.p.id}
              initial={rm ? false : { y: -40, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ ...SPRING_POP, delay: 0.7 + (3 - k) * 0.15 + i * 0.05 }}
              className="flex min-w-0 flex-col items-center"
            >
              <span
                aria-hidden
                className={`relative grid place-items-center overflow-hidden rounded-full border-[3px] ${s.ring}`}
                style={{
                  width: m.length > 1 ? s.av * 0.7 : s.av,
                  height: m.length > 1 ? s.av * 0.7 : s.av,
                  fontSize: (m.length > 1 ? s.av * 0.7 : s.av) * 0.56,
                  background: x.p.color,
                }}
              >
                <AvatarFill p={x.p} />
              </span>
              <span className="mt-2 max-w-[9rem] text-center text-20 font-bold leading-tight [overflow-wrap:anywhere]">
                {x.p.name}
              </span>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={rm ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.85, ease: EASE, delay: (3 - k) * 0.15 }}
          style={{ originY: 1, opacity: m.length ? 1 : 0.25 }}
          className={`flex w-full flex-col items-center rounded-t-[20px] pt-3.5 text-ink-podium shadow-[0_20px_50px_-16px_rgba(0,0,0,.7)] ${s.h} ${s.bg}`}
        >
          <span className={`disp font-extrabold leading-none ${s.text}`}>
            {k === 1 ? t.winner.first : k === 2 ? t.winner.second : t.winner.third}
          </span>
          <span className="disp tick mt-1 text-30 font-extrabold">
            {m.length ? fmt(m[0].t) : '—'}
          </span>
        </motion.div>
      </div>
    );
  };
  return (
    <DeskPage scroll label={t.winner.finalScores} className="dt:px-12 rail:overflow-hidden">
      <PageHead
        eyebrow={t.desk.winner.eyebrow(done.length)}
        title={title}
        actions={
          <>
            {reel.length > 0 && (
              <GhostButton onClick={() => setShowReel(true)}>
                🏅 {t.hub.game.achievementsN(reel.length)}
              </GhostButton>
            )}
            <GhostButton onClick={() => actions.openSheet({ type: 'share' })}>
              {Icon.share}
              {t.winner.share}
            </GhostButton>
            <GhostButton onClick={() => actions.go('home', -1)}>{t.common.home}</GhostButton>
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
          <motion.span
            initial={rm ? false : { y: -120, scale: 0.4, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ ...SPRING_POP, delay: 0.4 }}
            role="img"
            aria-label={t.desk.winner.trophy}
            className="absolute left-1/2 top-7 h-[min(84px,12cqh)] w-[min(84px,12cqh)] -translate-x-1/2 text-gold [filter:drop-shadow(0_0_24px_rgba(226,182,83,.6))]"
          >
            {Icon.trophy}
          </motion.span>
          <div className="flex w-full max-w-[40rem] items-end justify-center gap-4">
            {([2, 1, 3] as const).map(col)}
          </div>
        </section>
        <aside className="flex min-h-0 flex-col gap-4">
          <ol
            aria-label={t.desk.winner.ranking}
            className="glass scroll-thin flex shrink-0 flex-col gap-1 p-3.5 rail:max-h-[45%] rail:overflow-y-auto"
          >
            {st.map((x, i) => (
              <motion.li
                key={x.p.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING_SOFT, delay: 0.3 + i * 0.04 }}
                className="flex min-h-14 items-center gap-3 px-2.5"
              >
                <span className={`disp w-8 text-center text-22 font-extrabold ${rankTone(x.rank)}`}>
                  {x.rank}
                </span>
                <Avatar
                  p={x.p}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white/20 text-22"
                />
                <span className="min-w-0 flex-1 text-18 font-bold [overflow-wrap:anywhere]">
                  {x.p.name}
                </span>
                <span
                  className={`disp tick text-28 font-extrabold ${x.t < 0 ? 'text-[var(--neg-tx)]' : ''}`}
                >
                  {fmt(x.t)}
                </span>
              </motion.li>
            ))}
          </ol>
          {done.length > 0 && (
            <>
              <h2 className="disp text-22 font-extrabold tracking-[-0.03em]">
                {t.winner.highlights}
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <Highlight
                  i={0}
                  label={t.desk.winner.mostExact}
                  value={t.desk.winner.exactOf(S.sharp.exact, done.length)}
                  who={S.sharp.p}
                />
                <Highlight
                  i={1}
                  label={t.desk.winner.biggestRound}
                  value={sgnN(S.big.best)}
                  tone="text-[var(--pos)]"
                  who={S.big.p}
                />
                <Highlight
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
        </Sheet>
      )}
    </DeskPage>
  );
}
