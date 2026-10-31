import { motion, useReducedMotion } from 'framer-motion';
import { curRound, doneRounds, playerCounts, standings } from '@/domain';
import { agoTxt, sgnN } from '@/lib/format';
import { useApp } from '@/state/store';
import { useDeskKeys } from './useDeskKeys';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table } from '@/components/ui/Table';
import { EASE } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { DeskPage, Eyebrow, Kbd } from './DeskParts';
import { TodayStrip } from '@/components/TodayStrip';
import { ContinueCard } from '@/components/ContinueCard';
import { t } from '@/strings';

const SUITS = [
  { s: '♠', red: false, at: 'left-[2%] top-[2%]', d: 0 },
  { s: '♦', red: true, at: 'right-[3%] top-[1%]', d: 1.4 },
  { s: '♣', red: false, at: 'left-[38%] bottom-[2%]', d: 2.2 },
  { s: '♥', red: true, at: 'right-[2%] bottom-[1%]', d: 0.8 },
];

export function DeskHome() {
  const { state, actions } = useApp();
  const g = state.game,
    r = curRound(g),
    ld = standings(g)[0],
    rm = useReducedMotion();
  const fin = g.status === 'finished',
    demo = g.id === 'demo';
  useDeskKeys({ n: actions.startSetup, enter: actions.resume });
  const maxPlayers = Math.max(...playerCounts(2));
  return (
    <DeskPage scroll label={t.appName} className="rail:overflow-hidden">
      <div className="relative grid flex-1 items-center gap-10 py-4 rail:min-h-0 rail:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] rail:px-6 dt:grid-cols-[minmax(0,1fr)_minmax(0,40rem)] dt:gap-16 dt:px-8">
        {SUITS.map(({ s, red, at, d }) => (
          <motion.span
            key={s}
            aria-hidden
            className={`pointer-events-none absolute text-64 opacity-[.13] [text-shadow:0_0_24px_var(--glow)] ${at} ${red ? 'text-suit-red' : 'text-suit-black'}`}
            animate={rm ? undefined : { y: [0, -16, 0], rotate: [0, 8, 0] }}
            transition={{ duration: 7, delay: d, repeat: Infinity, ease: 'easeInOut' }}
          >
            {s}
          </motion.span>
        ))}
        <section className="@container relative flex flex-col items-center gap-6 text-center rail:items-start rail:text-left dt:gap-7">
          <motion.div {...stagger(0, 0.05)}>
            <Eyebrow>{t.desk.home.eyebrow}</Eyebrow>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="disp gold-text pb-2 text-96 font-extrabold leading-[.92] tracking-[-0.055em] @[40rem]:text-148"
          >
            {t.appName}
          </motion.h1>
          <motion.p
            {...stagger(1, 0.15)}
            className="max-w-[32.5rem] text-20 leading-[1.45] text-[var(--tx2)] dt:text-22"
          >
            {t.desk.home.pitch}
          </motion.p>
          <motion.div {...stagger(2, 0.15)} className="mt-2 flex flex-wrap justify-center gap-4">
            <PrimaryButton className="w-60" onClick={actions.startSetup}>
              {t.desk.home.newGame} <Kbd>N</Kbd>
            </PrimaryButton>
            <PrimaryButton
              tone="glass"
              className="w-52"
              onClick={() => actions.openSheet({ type: 'rules' })}
            >
              {t.desk.home.howToPlay}
            </PrimaryButton>
          </motion.div>
          <motion.ul
            {...stagger(3, 0.15)}
            className="mt-2 flex flex-wrap justify-center gap-2.5 rail:justify-start"
          >
            {[t.desk.home.players(maxPlayers), t.desk.home.hook, t.desk.home.offline].map((c) => (
              <li
                key={c}
                className="inline-flex h-9 items-center rounded-full border border-white/10 bg-white/[.06] px-3.5 text-14 font-bold"
              >
                {c}
              </li>
            ))}
          </motion.ul>
          <ContinueCard className="max-w-[32.5rem]" />
          <TodayStrip className="max-w-[32.5rem]" />
        </section>
        <motion.section
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
          aria-label={fin ? t.home.finished : t.home.resume}
          className="glass glass-glow relative mx-auto flex w-full max-w-[40rem] flex-col gap-4 p-6 dt:gap-[18px] dt:p-7"
        >
          <div className="flex items-center justify-between gap-3">
            {demo ? (
              <span className="rounded-md bg-[var(--gold)] px-2 py-0.5 text-13 font-bold uppercase tracking-[0.12em] text-ink-gold">
                {t.home.demoBadge}
              </span>
            ) : (
              <Eyebrow>{fin ? t.home.finished : t.home.resume}</Eyebrow>
            )}
            {!demo && (
              <span className="text-13 text-[var(--tx2)]">{t.home.saved(agoTxt(g.updatedAt))}</span>
            )}
          </div>
          <h2 className="disp text-28 font-extrabold leading-[1.1] tracking-[-0.03em] dt:text-36">
            {demo
              ? t.home.demoTitle
              : fin
                ? t.home.wonWith(ld.p.name, sgnN(ld.t))
                : t.home.roundLine(r.index + 1, r.cards, r.trump)}
          </h2>
          {demo && <p className="text-16 leading-[1.4] text-[var(--tx2)]">{t.home.demoBody}</p>}
          <div className="-my-1 flex h-[clamp(14rem,34vh,20rem)] flex-col">
            <Table
              uid="home"
              size="wide"
              fit
              minFit={0.5}
              players={g.players}
              dir={g.direction}
              dealer={fin ? undefined : r.dealerIndex}
              first={fin ? undefined : r.firstPlayerIndex}
              noSeatAnim={false}
              center={fin ? undefined : <SuitCenter trump={r.trump} cards={r.cards} />}
            />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 text-16">
              {fin ? (
                <div className="text-[var(--tx2)]">{t.home.roundsPlayed(doneRounds(g).length)}</div>
              ) : (
                <>
                  <div className="text-18">
                    {t.desk.home.firstCard(
                      g.players[r.dealerIndex].name,
                      g.players[r.firstPlayerIndex].name,
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2.5 text-[var(--tx2)]">
                    <span
                      aria-hidden
                      className="grid h-7 w-7 place-items-center rounded-full text-16"
                      style={{ background: ld.p.color }}
                    >
                      {ld.p.emoji}
                    </span>
                    <span>{t.desk.home.leadsWith(ld.p.name, sgnN(ld.t))}</span>
                  </div>
                </>
              )}
            </div>
            <PrimaryButton className="w-44" onClick={actions.resume}>
              {fin ? t.desk.home.results : t.desk.home.resume} <Kbd>⏎</Kbd>
            </PrimaryButton>
          </div>
        </motion.section>
      </div>
    </DeskPage>
  );
}
