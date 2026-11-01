import { AnimatePresence, m } from 'framer-motion';
import { useId, useState, type CSSProperties } from 'react';
import { roundAt, type Game, type Round } from '@/domain';
import { useApp } from '@/state/store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { MQ } from '@/theme/breakpoints';
import { Glass } from '@/components/ui/Glass';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table } from '@/components/ui/Table';
import { EASE, PRESS_SM, SPRING, SPRING_POP } from '@/components/ui/motion';
import { shakeKF } from '@/components/ui/stagger';
import { RoundFrame } from './RoundFrame';
import { bidView } from './roundView';
import { t } from '@/strings';
import { Avatar, type Face } from '@/components/ui/Avatar';

/** Who deals and how many cards, big enough to read across the table; first card and trump under it. */
function DealLine({ g, r }: { g: Game; r: Round }) {
  const prev = r.index > 0 ? roundAt(g, r.index - 1).cards : 0,
    ar = r.cards > prev ? '↑' : r.cards < prev ? '↓' : '→';
  return (
    <>
      <span className="disp block text-20 font-bold leading-[1.2] tracking-[-0.02em] [&_[data-n]]:text-28 [&_[data-n]]:leading-none [&_[data-n]]:text-[var(--accent)] wide:text-22 wide:[&_[data-n]]:text-32">
        {t.deal.head(g.players[r.dealerIndex].name, r.cards)}
      </span>
      <span className="mt-1 block text-15 leading-[1.35] text-[var(--tx2)] [&_b]:text-[var(--tx)]">
        {t.round.dealSub(g.players[r.firstPlayerIndex].name, r.trump, ar)}
      </span>
    </>
  );
}

/**
 * The hero "who" row (BiddingHero.dc.html): avatar, a kicker, the player's name set big, and the live bid tally. The
 * name steps down with its length so it stays on one line at 360px; short screens scale the whole row.
 */
export function HeroWho({
  p,
  kicker,
  tally,
  of,
}: {
  p: Face & { name: string };
  kicker: string;
  tally: number;
  of: number;
}) {
  const k = Math.max(0.42, Math.min(1, 6.5 / Math.max(1, [...p.name].length)));
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-3.5 px-1 [--hero-s:1] @h-short:[--hero-s:.6] @h-tiny:[--hero-s:.5]">
      <Avatar
        p={p}
        className="mat-av grid h-[calc(52px*var(--hero-s))] w-[calc(52px*var(--hero-s))] min-h-10 min-w-10 shrink-0 place-items-center self-center rounded-full text-28"
      />
      <div className="min-w-0">
        <p className="mono-label text-[0.6875rem] font-medium leading-4 text-[var(--tx2)]">
          {kicker}
        </p>
        <h2
          className="hero-name pb-[0.06em] [overflow-wrap:anywhere]"
          style={{
            fontSize: `max(1.5rem, calc(var(--big-size) * ${k} * var(--hero-s)))`,
            // The size is the theme's, the line box is not: every theme's row is the same height.
            lineHeight: `max(1.4rem, calc(59px * ${k} * var(--hero-s)))`,
          }}
        >
          {p.name}
        </h2>
      </div>
      {/* The meter below says the same in words. */}
      <p aria-hidden className="hero-tally flex items-baseline gap-0.5 leading-none">
        <span style={{ fontSize: 'max(1.5rem, calc(44px * var(--hero-s)))' }}>{tally}</span>
        <small>/{of}</small>
      </p>
    </div>
  );
}

/** One row up to six pills, else two rows, so the dock stays short; never more than six across. */
const pillColumns = (pills: number) => Math.min(6, pills <= 6 ? pills : Math.ceil(pills / 2));

export function Bidding() {
  const { state, actions } = useApp();
  const g = state.game;
  const { r, n, pI, p, isD, allBid, forb, hookWarn, sum, cnt, diff, dealer, cap } = bidView(g);
  const [shake, setShake] = useState<number | null>(null);
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
      hero
      r={r}
      fit
      aside={
        // Content height: a long name wraps instead of being cut. The old and new card share one grid cell, so
        // the slide moves transforms only and the cell follows the taller of the two.
        <div className="mt-3 @h-short:mt-2 pane:mt-0 pane:flex pane:min-h-full pane:flex-col pane:justify-end">
          <div className="@h-[24rem]:hidden">
            <div className="grid">
              <AnimatePresence initial={false}>
                <m.div
                  key={pI}
                  initial={{ opacity: 0, x: 44, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -44, scale: 0.97 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className="[grid-area:1/1]"
                >
                  <HeroWho p={p} kicker={cap} tally={sum} of={r.cards} />
                </m.div>
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
            <div className="mat-meter mt-1.5 h-2 overflow-hidden rounded-full @h-short:mt-1 @h-[24rem]:hidden">
              <m.div
                className="relative h-full origin-left"
                animate={{ scaleX: Math.min(1, sum / r.cards) }}
                transition={SPRING}
              >
                <m.i
                  className="mat-meter-fill absolute inset-0"
                  animate={{ opacity: diff > 0 ? 0 : 1 }}
                  transition={{ duration: 0.2, ease: EASE }}
                />
                <m.i
                  className="absolute inset-0 bg-[var(--warn)]"
                  animate={{ opacity: diff > 0 ? 1 : 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                />
              </m.div>
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
                <m.button
                  key={v}
                  type="button"
                  aria-label={lock ? t.bidding.locked(v) : t.bidding.bid(v)}
                  aria-pressed={sel}
                  aria-disabled={lock || undefined}
                  aria-describedby={lock ? reasonId : undefined}
                  {...roving.item(v)}
                  animate={shake === v ? shakeKF : { x: 0 }}
                  whileTap={PRESS_SM}
                  onClick={() => pick(v)}
                  className={`disp relative grid aspect-square min-h-11 w-full min-w-11 max-w-[60px] @h-short:max-w-12 @h-tiny:max-w-11 place-items-center rounded-[18px] text-22 font-bold tracking-[-0.02em] ${lock ? 'mat-key-no' : sel ? 'mat-key text-ink-on-accent' : 'mat-key'}`}
                >
                  {sel && (
                    <m.span
                      layoutId="pillsel"
                      transition={SPRING_POP}
                      className="mat-key-on absolute inset-0 rounded-[18px]"
                    />
                  )}
                  {/* The forbidden bid is struck through by its material, not a lock (reference audit fix). */}
                  <span className="relative">{v}</span>
                </m.button>
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
        <p className="px-2 pb-0.5 pt-2.5 text-center tracking-[-0.01em] [text-wrap:balance] @h-short:sr-only">
          <DealLine g={g} r={r} />
        </p>
      </Glass>
    </RoundFrame>
  );
}
