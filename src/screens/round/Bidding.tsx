import { AnimatePresence, motion } from 'framer-motion';
import { useId, useState, type CSSProperties } from 'react';
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
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { MQ } from '@/theme/breakpoints';
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

/** One row up to six pills, else two rows, so the dock stays short; never more than six across. */
const pillColumns = (pills: number) => Math.min(6, pills <= 6 ? pills : Math.ceil(pills / 2));

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
  const cap = isD ? t.bidding.dealerLast : bi === 0 ? t.bidding.first : t.bidding.nth(bi + 1, n);
  // Two lines of text do not fit a short, narrow pane, so it swaps to a one-line wording there.
  const reason =
    hookWarn && isD ? (
      t.bidding.earlierBidInvalid
    ) : isD && forb != null ? (
      <>
        <span className="@h-[24rem]:hidden">{t.bidding.cantBid(forb, r.cards)}</span>
        <span className="hidden @h-[24rem]:inline">{t.bidding.cantBidShort(forb, r.cards)}</span>
      </>
    ) : null;
  const reasonId = useId();
  // Geometry cannot be switched in CSS, so this is the one JS media query outside dialogs. Only props change on
  // rotation: the screen stays mounted and keeps its bids, bidder and selection.
  const wide = useMediaQuery(MQ.wide);
  // The grid narrows to fewer columns on a tight pane, so the row length is read from the layout.
  const roving = useRovingFocus({
    selected: r.bids[p.id] ?? -1,
    columns: 'auto',
    orientation: 'grid',
  });
  const cols = pillColumns(r.cards + 1);
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
      fit
      aside={
        // Content height: a long name wraps instead of being cut. The old and new card share one grid cell, so
        // the slide moves transforms only and the cell follows the taller of the two.
        <div className="mt-3 @h-short:mt-2 pane:mt-0 pane:flex pane:min-h-full pane:flex-col pane:justify-end">
          <div className="@h-[24rem]:hidden">
            <div className="grid">
              <AnimatePresence initial={false}>
                <motion.div
                  key={pI}
                  initial={{ opacity: 0, x: 44, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -44, scale: 0.97 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className="[grid-area:1/1]"
                >
                  <Glass
                    spot={false}
                    className="flex items-center gap-4 px-4 py-3 @h-short:gap-3 @h-short:py-1"
                  >
                    <div
                      className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-white/20 text-36 shadow-[0_8px_22px_rgba(0,0,0,.5)] @h-short:h-12 @h-short:w-12 @h-short:text-26"
                      style={{ background: p.color }}
                    >
                      {p.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="disp text-26 font-extrabold leading-[1.1] tracking-[-0.035em] [overflow-wrap:anywhere] [text-wrap:balance] @h-short:text-22 wide:text-32 wide:@h-short:text-22">
                        {p.name}
                      </div>
                      <div className="mt-0.5 text-16 text-[var(--tx2)] @h-short:text-14">{cap}</div>
                    </div>
                  </Glass>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      }
      bar={
        // The dock: everything a bidder touches sits in the thumb's reach, above the button.
        <div className="flex w-full flex-col gap-2.5 @h-short:gap-2 @h-tiny:gap-1.5 @h-[24rem]:gap-1">
          <div>
            <div className="flex justify-between text-15 font-bold tracking-[-0.01em] @h-[24rem]:leading-4">
              <span>{t.bidding.total(sum, r.cards)}</span>
              <span className={diff === 0 ? 'text-[var(--pos)]' : 'text-[var(--warn)]'}>
                {diff < 0
                  ? t.bidding.under(-diff)
                  : diff > 0
                    ? t.bidding.over(diff)
                    : t.bidding.level}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[.08] @h-short:mt-1 @h-[24rem]:hidden">
              <motion.div
                className="relative h-full origin-left"
                animate={{ scaleX: Math.min(1, sum / r.cards) }}
                transition={SPRING}
              >
                <motion.i
                  className="absolute inset-0 bg-[var(--accent)]"
                  animate={{ opacity: diff > 0 ? 0 : 1 }}
                  transition={{ duration: 0.2, ease: EASE }}
                />
                <motion.i
                  className="absolute inset-0 bg-[var(--warn)]"
                  animate={{ opacity: diff > 0 ? 1 : 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                />
              </motion.div>
            </div>
          </div>
          <div
            id={reasonId}
            aria-live="polite"
            className="min-h-5 text-14 font-medium leading-5 text-[var(--warn)] @h-[24rem]:min-h-0"
          >
            {reason}
          </div>
          <div
            role="group"
            aria-label={t.bidding.bidFor(p.name)}
            {...roving.group}
            // At most `cols` across and each at least 44px: the gap gives way before a pill gets smaller.
            style={
              {
                '--g': `max(0px, min(0.5rem, calc((100% - ${cols} * 2.75rem) / ${cols - 1})))`,
                columnGap: 'var(--g)',
                gridTemplateColumns: `repeat(auto-fill, minmax(max(2.75rem, calc((100% - ${cols - 1} * var(--g)) / ${cols})), 1fr))`,
              } as CSSProperties
            }
            className="grid justify-items-center gap-y-2 @h-short:gap-y-1.5 @h-tiny:gap-y-1"
          >
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
                  aria-describedby={lock ? reasonId : undefined}
                  {...roving.item(v)}
                  animate={shake === v ? shakeKF : { x: 0 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => pick(v)}
                  className={`disp relative grid aspect-square min-h-11 w-full min-w-11 max-w-[60px] @h-short:max-w-12 @h-tiny:max-w-11 place-items-center rounded-[18px] text-22 font-bold tracking-[-0.02em] ${lock ? 'border border-dashed border-white/20 bg-white/[.03] text-[var(--ph)]' : sel ? 'text-ink-on-accent' : 'glass'}`}
                >
                  {sel && (
                    <motion.span
                      layoutId="pillsel"
                      transition={SPRING_POP}
                      className="absolute inset-0 rounded-[18px] bg-accent-gradient shadow-[0_0_0_3px_var(--glow),0_10px_26px_-6px_var(--accent)]"
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
          {allBid && !hookWarn ? (
            <PrimaryButton
              className="w-full @h-short:!h-14 @h-[36rem]:!h-12 @h-tiny:!h-12 @h-[24rem]:!h-11"
              onClick={() => actions.phase('playing')}
            >
              {t.bidding.startPlaying}
            </PrimaryButton>
          ) : (
            <PrimaryButton
              className="w-full @h-short:!h-14 @h-[36rem]:!h-12 @h-tiny:!h-12 @h-[24rem]:!h-11"
              disabled
            >
              {t.bidding.bidsIn(cnt, n)}
            </PrimaryButton>
          )}
        </div>
      }
    >
      <Glass glow spot={false} className="flex min-h-0 flex-1 flex-col p-2 pb-2.5">
        <div className="-mx-2 flex min-h-0 flex-1 flex-col">
          <Table
            uid="bid"
            fit
            size={wide ? 'full' : 'mini'}
            big={wide}
            players={g.players}
            dir={g.direction}
            dealer={r.dealerIndex}
            first={r.firstPlayerIndex}
            bids={r.bids}
            cur={pI}
            warn={hookWarn && r.bids[dealer.id] === undefined ? r.dealerIndex : undefined}
            onSeat={actions.pickSeat}
            noSeatAnim
            center={<SuitCenter trump={r.trump} cards={r.cards} big={wide} />}
          />
        </div>
        <p className="px-2 pb-0.5 pt-2.5 text-center text-16 leading-[1.38] tracking-[-0.01em] [text-wrap:balance] @h-short:sr-only">
          {dealLine(g, r)}
        </p>
      </Glass>
    </RoundFrame>
  );
}
