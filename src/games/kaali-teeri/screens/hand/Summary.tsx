import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import {
  dealerFor,
  doneHands,
  firstSpeaker,
  handScore,
  result,
  standings,
  totals,
  type KtGame,
  type KtHand,
} from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kp } from '@/games/kaali-teeri/strings/play';
import { Avatar } from '@/components/ui/Avatar';
import { Counter } from '@/components/ui/Counter';
import { Glass } from '@/components/ui/Glass';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Scaffold } from '@/components/ui/Scaffold';
import { SuitGlyph } from '@/components/ui/SuitGlyph';
import { EASE, ENTER, EXIT, SPRING, SPRING_POP } from '@/components/ui/motion';
import { fmt, sgnN } from '@/lib/format';
import { palette } from '@/theme/palette';
import { Pill, RoleBadge, roleOf } from './parts/bits';

const rankColor = (rank: number) =>
  rank === 1
    ? palette.gold
    : rank === 2
      ? palette['rank-silver']
      : rank === 3
        ? palette['rank-bronze']
        : 'var(--tx)';

// A hand confirmed this long ago or less counts up on arrival; reopening the summary later shows it settled.
const FRESH_MS = 4000;
// The sweep's beat: it is announced, alone, before anything counts.
const SWEEP_MS = 900;

/** Plan §3 screen 8: totals after the hand, this hand's changes, standings and who deals next. */
export default function Summary() {
  const { state, actions } = useKt();
  const g = state.game;
  const done = g ? doneHands(g) : [];
  const h = done.at(-1);
  if (!g || !h) return <SummaryEmpty />;
  return <SummaryBody g={g} h={h} onNext={actions.nextHand} onEnd={() => actions.ask('finish')} />;
}

function SummaryEmpty() {
  const { actions } = useKt();
  return (
    <Scaffold
      left={
        <IconButton chrome label={kp.hand.menu} onClick={() => actions.openSheet({ type: 'menu' })}>
          {Icon.menu}
        </IconButton>
      }
    >
      <p className="py-5 text-16 text-[var(--tx2)]">{kp.board.empty}</p>
    </Scaffold>
  );
}

/** Everything both summaries show for the hand just scored, with the count-up's stages. */
export function useSummaryData(g: KtGame, h: KtHand) {
  const rm = useReducedMotion();
  /* The board before this hand is frozen at mount so the count-up has somewhere to start. */
  /* eslint-disable react-hooks/exhaustive-deps */
  const fresh = useMemo(() => !rm && h.doneAt != null && Date.now() - h.doneAt < FRESH_MS, []);
  const before = useMemo(() => doneHands(g).filter((x) => x !== h), []);
  const beat = useMemo(() => fresh && (result(h, g.rules)?.sweep ?? 'none') !== 'none', []);
  /* eslint-enable react-hooks/exhaustive-deps */
  const [stage, setStage] = useState(fresh ? 0 : 3);
  const [sweeping, setSweeping] = useState(beat);
  useEffect(() => {
    if (!fresh) return;
    const wait = beat ? SWEEP_MS : 0;
    const ts = [250, 700, 1500].map((ms, k) => setTimeout(() => setStage(k + 1), wait + ms));
    if (beat) ts.push(setTimeout(() => setSweeping(false), SWEEP_MS));
    return () => ts.forEach(clearTimeout);
  }, [fresh, beat]);
  const pt = totals(g, before),
    ct = totals(g);
  const list = stage >= 3 ? standings(g) : standings(g, before);
  const ids = g.players.map((p) => p.id);
  const delta = handScore(h, g.rules, ids);
  const res = result(h, g.rules)!;
  const bidder = g.players.find((p) => p.id === h.bidder)!;
  const next = h.index + 1;
  const nD = g.players[dealerFor(g, next)],
    nF = g.players[firstSpeaker(g, next)];
  const line =
    res.sweep === 'bidders'
      ? kp.summary.sweptBy(bidder.name)
      : res.sweep === 'defenders'
        ? kp.summary.sweptDef
        : res.made
          ? kp.summary.made(bidder.name, h.teamPoints!, h.bid!)
          : kp.summary.missed(bidder.name, h.teamPoints!, h.bid!);
  const good = res.sweep === 'bidders' || (res.made && res.sweep === 'none');
  const final = standings(g);
  return {
    stage,
    fresh,
    beat,
    sweeping,
    pt,
    ct,
    list,
    delta,
    res,
    line,
    good,
    final,
    next,
    nD,
    nF,
  };
}

type Data = ReturnType<typeof useSummaryData>;

/** "Made: Meera's team took 190 of 180 · ♥ trump", and the standings for assistive tech once they settle. */
export function ResultLine({ d, h }: { d: Data; h: KtHand }) {
  const { good, line, stage, final, delta, res, sweeping } = d;
  return (
    <>
      <div className="relative mb-3">
        <m.p
          initial={false}
          animate={{ opacity: sweeping ? 0 : 1 }}
          transition={{ duration: ENTER, ease: EASE }}
          className="flex flex-wrap items-center gap-x-1.5 text-15 text-[var(--tx2)]"
        >
          <span aria-hidden className={good ? 'text-[var(--pos)]' : 'text-[var(--neg-tx)]'}>
            {good ? kp.board.made : kp.board.missed}
          </span>
          <span>{line}</span>
          <span aria-hidden>·</span>
          <span>
            <SuitGlyph trump={h.trump!} /> {kp.summary.trump}
          </span>
        </m.p>
        {/* The sweep, announced over the line it then gives way to; the line itself is what assistive tech reads. */}
        <AnimatePresence>
          {sweeping && (
            <m.span
              aria-hidden
              data-kt-sweep
              initial={{ opacity: 0, scale: 0.94, y: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: '-50%' }}
              exit={{ opacity: 0, y: '-50%', transition: { duration: EXIT } }}
              transition={{ duration: ENTER, ease: EASE }}
              className="disp pointer-events-none absolute left-0 top-1/2 origin-left whitespace-nowrap text-26 font-extrabold leading-none tracking-[-0.03em]"
            >
              {res.sweep === 'bidders' ? kp.result.sweepBidders : kp.result.sweepDefenders}
            </m.span>
          )}
        </AnimatePresence>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {stage >= 3 &&
          kp.summary.announce(
            final.map((x) => ({ name: x.p.name, d: sgnN(delta[x.p.id]), t: fmt(x.t) })),
          )}
      </p>
    </>
  );
}

/** The standings after the hand: this hand's change and the total counting up. */
export function StandingsList({ d, h }: { d: Data; h: KtHand }) {
  const { list, delta, res, stage, fresh, beat, sweeping, pt, ct } = d;
  return (
    <div
      role="region"
      aria-label={kp.summary.standings}
      tabIndex={0}
      className="@container scroll-thin relative min-h-[8.5rem] flex-1 overflow-y-auto overflow-x-hidden"
    >
      {list.map((x) => {
        const id = x.p.id,
          d = delta[id],
          role = roleOf(h, id);
        const swept = res.sweep === 'bidders' ? !!role : res.sweep === 'defenders' && !role;
        return (
          <m.div
            layout="position"
            key={id}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="mb-1.5"
          >
            <Glass spot={false} className="relative flex min-h-16 items-center gap-2.5 px-3 py-2">
              {beat && swept && (
                // The sweeping side's rows light once during the beat: the team's colour, or the accent for defenders.
                <m.span
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.22, 0.22, 0] }}
                  transition={{
                    duration: 0.7,
                    delay: 0.15,
                    times: [0, 0.3, 0.65, 1],
                    ease: 'easeInOut',
                  }}
                  className={`pointer-events-none absolute inset-0 rounded-[inherit] ${res.sweep === 'bidders' ? 'bg-kt-bid' : 'bg-[var(--accent)]'}`}
                />
              )}
              <div
                className="disp w-6 shrink-0 text-center text-22 font-extrabold"
                style={{ color: rankColor(x.rank) }}
              >
                {x.rank}
              </div>
              <Avatar
                p={x.p}
                className="mat-av grid h-11 w-11 shrink-0 place-items-center rounded-full text-24"
              />
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="block max-w-full break-words text-17 font-bold leading-[1.2] tracking-[-0.015em] @[26rem]:text-18">
                  {x.p.name}
                </span>
                {(role || res.sweep !== 'none') && (
                  <span className="flex flex-wrap gap-1">
                    {role && <RoleBadge kind={role} />}
                    {res.sweep !== 'none' && d > 0 && (
                      // After the beat the announcement settles here.
                      <m.span
                        className="inline-flex"
                        initial={false}
                        animate={{ opacity: sweeping ? 0 : 1, scale: sweeping ? 0.9 : 1 }}
                        transition={SPRING}
                      >
                        <Pill>{kp.role.sweep}</Pill>
                      </m.span>
                    )}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {stage >= 1 && (
                  <m.span
                    initial={fresh ? { scale: 0.4, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={SPRING_POP}
                    className={`min-w-10 shrink-0 rounded-xl px-2 py-0.5 text-center text-15 font-extrabold ${d > 0 ? 'bg-[var(--success-soft)] text-[var(--pos)]' : 'bg-ov/[.08] text-[var(--tx2)]'}`}
                  >
                    {sgnN(d)}
                  </m.span>
                )}
              </AnimatePresence>
              <div className="disp tick min-w-[3.25rem] shrink-0 text-right text-26 font-extrabold tracking-[-0.03em] @[26rem]:text-28">
                <Counter from={fresh ? pt[id] : ct[id]} to={ct[id]} run={fresh && stage >= 2} />
              </div>
            </Glass>
          </m.div>
        );
      })}
    </div>
  );
}

function SummaryBody({
  g,
  h,
  onNext,
  onEnd,
}: {
  g: KtGame;
  h: KtHand;
  onNext: () => void;
  onEnd: () => void;
}) {
  const { actions } = useKt();
  const d = useSummaryData(g, h);
  const { next, nD, nF } = d;
  return (
    <Scaffold
      title={kp.summary.title(h.index + 1)}
      navTitle={kp.summary.title(h.index + 1)}
      fit
      left={
        <IconButton chrome label={kp.hand.menu} onClick={() => actions.openSheet({ type: 'menu' })}>
          {Icon.menu}
        </IconButton>
      }
      right={
        <IconButton
          chrome
          label={kp.hand.scoreboard}
          onClick={() => actions.openSheet({ type: 'board' })}
        >
          {Icon.board}
        </IconButton>
      }
      aside={
        <Glass spot={false} className="mt-3 px-4 py-3 text-center text-15 leading-[1.4] pane:mt-0">
          <span className="[text-wrap:balance]">{kp.summary.next(next + 1, nD.name, nF.name)}</span>
        </Glass>
      }
      bar={
        <>
          <PrimaryButton tone="glass" className="px-5" onClick={onEnd}>
            {kp.summary.endGame}
          </PrimaryButton>
          <PrimaryButton className="flex-1" onClick={onNext}>
            {kp.summary.nextHand}
          </PrimaryButton>
        </>
      }
    >
      <ResultLine d={d} h={h} />
      <StandingsList d={d} h={h} />
    </Scaffold>
  );
}
