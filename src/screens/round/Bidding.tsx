import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import {
  bidOrder,
  curRound,
  forbiddenFor,
  roundAt,
  sumBids,
  type Game,
  type Round,
} from '@/domain';
import { useApp } from '@/state/store';
import { palette } from '@/theme/palette';
import { Glass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table } from '@/components/ui/Table';
import { EASE, SPRING, SPRING_POP } from '@/components/ui/motion';
import { shakeKF } from '@/components/ui/stagger';
import { RoundFrame } from './RoundFrame';
import { t } from '@/strings';

export const dealLine = (g: Game, r: Round) => {
  const prev = r.index > 0 ? roundAt(g, r.index - 1).cards : 0,
    ar = r.cards > prev ? '↑' : r.cards < prev ? '↓' : '→';
  return t.round.deal(
    g.players[r.dealerIndex].name,
    r.cards,
    g.players[r.firstPlayerIndex].name,
    r.trump,
    ar,
  );
};

export function Bidding() {
  const { state, actions } = useApp();
  const g = state.game,
    r = curRound(g),
    n = g.players.length,
    od = bidOrder(g, r);
  const bi = Math.min(g.ui.bidIdx, n - 1),
    pI = od[bi],
    p = g.players[pI],
    isD = pI === r.dealerIndex;
  const allBid = g.players.every((q) => r.bids[q.id] !== undefined),
    forb = isD ? forbiddenFor(g, r) : null,
    hookWarn = g.ui.hookWarn;
  const sum = sumBids(r),
    cnt = Object.keys(r.bids).length,
    diff = sum - r.cards;
  const [shake, setShake] = useState<number | null>(null);
  const dealer = g.players[r.dealerIndex];
  const cap =
    hookWarn && isD ? (
      <span className="text-[var(--warn)]">{t.bidding.earlierBidInvalid}</span>
    ) : isD ? (
      t.bidding.dealerLast
    ) : bi === 0 ? (
      t.bidding.first
    ) : (
      t.bidding.nth(bi + 1, n)
    );
  const pick = (v: number) => {
    const locked = isD && v === forb;
    actions.bid(v);
    if (locked) {
      setShake(v);
      setTimeout(() => setShake(null), 320);
    }
  };
  return (
    <RoundFrame
      r={r}
      bar={
        allBid && !hookWarn ? (
          <PrimaryButton className="w-full" onClick={() => actions.phase('playing')}>
            {t.bidding.startPlaying}
          </PrimaryButton>
        ) : (
          <PrimaryButton className="w-full" disabled>
            {t.bidding.bidsIn(cnt, n)}
          </PrimaryButton>
        )
      }
    >
      <Glass glow spot={false} className="p-2 pb-2.5">
        <Table
          uid="bid"
          size="mini"
          players={g.players}
          dir={g.direction}
          dealer={r.dealerIndex}
          first={r.firstPlayerIndex}
          bids={r.bids}
          cur={pI}
          warn={hookWarn && r.bids[dealer.id] === undefined ? r.dealerIndex : undefined}
          onSeat={actions.pickSeat}
          noSeatAnim
          center={<SuitCenter trump={r.trump} cards={r.cards} />}
        />
        <p className="px-2 pb-0.5 pt-2.5 text-center text-16 leading-[1.38] tracking-[-0.01em]">
          {dealLine(g, r)}
        </p>
      </Glass>
      <div className="relative my-4 h-[104px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={pI}
            initial={{ opacity: 0, x: 44, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -44, scale: 0.97 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="absolute inset-0"
          >
            <Glass spot={false} className="flex h-full items-center gap-4 px-4">
              <div
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-white/20 text-36 shadow-[0_8px_22px_rgba(0,0,0,.5)]"
                style={{ background: p.color }}
              >
                {p.emoji}
              </div>
              <div className="min-w-0">
                <div className="disp truncate text-26 font-extrabold leading-[1.05] tracking-[-0.035em]">
                  {p.name}
                </div>
                <div className="mt-1 text-16 text-[var(--tx2)]">{cap}</div>
                {isD && forb != null && !hookWarn && (
                  <div className="text-14 text-[var(--warn)]">
                    {t.bidding.cantBid(forb, r.cards)}
                  </div>
                )}
              </div>
            </Glass>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="grid grid-cols-6 justify-items-center gap-1.5">
        {Array.from({ length: r.cards + 1 }, (_, v) => {
          const lock = isD && forb === v,
            sel = r.bids[p.id] === v;
          return (
            <motion.button
              key={v}
              type="button"
              aria-label={lock ? t.bidding.locked(v) : t.bidding.bid(v)}
              aria-pressed={sel}
              aria-disabled={lock || undefined}
              animate={shake === v ? shakeKF : { x: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => pick(v)}
              className={`disp relative grid aspect-square w-full max-w-14 place-items-center rounded-[18px] text-22 font-bold tracking-[-0.02em] ${lock ? 'border border-dashed border-white/20 bg-white/[.03] text-[var(--dis)]' : sel ? 'text-ink-on-accent' : 'glass'}`}
            >
              {sel && (
                <motion.span
                  layoutId="pillsel"
                  transition={SPRING_POP}
                  className="absolute inset-0 rounded-[18px] bg-[linear-gradient(135deg,var(--accent),color-mix(in_srgb,var(--accent)_58%,black))] shadow-[0_0_0_3px_var(--glow),0_10px_26px_-6px_var(--accent)]"
                />
              )}
              <span className={`relative ${lock ? 'line-through' : ''}`}>{v}</span>
              {lock && (
                <span className="absolute right-1 top-1 text-[var(--warn)]">{Icon.lock}</span>
              )}
            </motion.button>
          );
        })}
      </div>
      <Glass spot={false} className="mt-4 px-3.5 py-3">
        <div className="flex justify-between text-16 font-bold tracking-[-0.01em]">
          <span>{t.bidding.total(sum, r.cards)}</span>
          <span className={diff === 0 ? 'text-[var(--pos)]' : 'text-[var(--warn)]'}>
            {diff < 0 ? t.bidding.under(-diff) : diff > 0 ? t.bidding.over(diff) : t.bidding.level}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.08]">
          <motion.div
            className="h-full origin-left rounded-full"
            animate={{
              scaleX: Math.min(1, sum / r.cards),
              backgroundColor: diff > 0 ? palette.warning : palette['accent-spades'],
            }}
            style={{ background: diff > 0 ? 'var(--warn)' : 'var(--accent)' }}
            transition={SPRING}
          />
        </div>
      </Glass>
    </RoundFrame>
  );
}
