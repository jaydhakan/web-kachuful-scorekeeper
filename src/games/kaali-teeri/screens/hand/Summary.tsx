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
import { SPRING_POP } from '@/components/ui/motion';
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
  /* eslint-enable react-hooks/exhaustive-deps */
  const [stage, setStage] = useState(fresh ? 0 : 3);
  useEffect(() => {
    if (!fresh) return;
    const ts = [250, 700, 1500].map((ms, k) => setTimeout(() => setStage(k + 1), ms));
    return () => ts.forEach(clearTimeout);
  }, [fresh]);
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
  return { stage, fresh, pt, ct, list, delta, res, line, good, final, next, nD, nF };
}

type Data = ReturnType<typeof useSummaryData>;

/** "Made: Meera's team took 190 of 180 · ♥ trump", and the standings for assistive tech once they settle. */
export function ResultLine({ d, h }: { d: Data; h: KtHand }) {
  const { good, line, stage, final, delta } = d;
  return (
    <>
      <p className="mb-3 flex flex-wrap items-center gap-x-1.5 text-15 text-[var(--tx2)]">
        <span aria-hidden className={good ? 'text-[var(--pos)]' : 'text-[var(--neg-tx)]'}>
          {good ? kp.board.made : kp.board.missed}
        </span>
        <span>{line}</span>
        <span aria-hidden>·</span>
        <span>
          <SuitGlyph trump={h.trump!} /> {kp.summary.trump}
        </span>
      </p>
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
  const { list, delta, res, stage, fresh, pt, ct } = d;
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
        return (
          <m.div
            layout="position"
            key={id}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="mb-1.5"
          >
            <Glass spot={false} className="relative flex min-h-16 items-center gap-2.5 px-3 py-2">
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
                    {res.sweep !== 'none' && d > 0 && <Pill>{kp.role.sweep}</Pill>}
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
