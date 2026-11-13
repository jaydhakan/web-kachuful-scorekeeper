import { AnimatePresence, m, useIsPresent, useReducedMotion } from 'framer-motion';
import { useId, useState, type ReactNode } from 'react';
import { useApp } from '@/games/kachuful/state/store';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useBoxHeight } from '@/hooks/useBoxHeight';
import { TD, minScale } from '@/lib/tableGeometry';
import { MQ } from '@/theme/breakpoints';
import { useBidFlight } from '@/components/ui/BidFlight';
import { BidKeys } from '@/components/ui/BidKeypad';
import { Glass } from '@/components/ui/Glass';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table } from '@/components/ui/Table';
import { EASE, PRESS_SM, REDUCED, SPRING } from '@/components/ui/motion';
import { t } from '@/strings';
import { DealLine, HeroWho } from './Bidding';
import { RoundFrame } from './RoundFrame';
import { bidView } from './roundView';

/** Seconds: the part that leaves goes faster than the new one arrives, so the two barely overlap. */
const OUT = 0.11;
const IN = 0.2;
// Both phases' buttons step down together on short screens, so the bar (and the table above it) keeps its height.
const BTN_H = '@h-short:!h-14 @h-[36rem]:!h-12 @h-tiny:!h-12 @h-[24rem]:!h-11';
const EDIT_SIZE =
  'h-[60px] w-[60px] @h-short:h-14 @h-short:w-14 @h-[36rem]:h-12 @h-[36rem]:w-12 @h-tiny:h-12 @h-tiny:w-12 @h-[24rem]:h-11 @h-[24rem]:w-11';

/** What differs between bidding and playing. The two share a grid cell and cross-fade; the one leaving takes no taps. */
function Part({ children, className = '' }: { children: ReactNode; className?: string }) {
  const here = useIsPresent();
  const rm = useReducedMotion();
  return (
    <m.div
      initial={rm ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: rm ? REDUCED : IN, ease: EASE } }}
      exit={{ opacity: 0, transition: { duration: rm ? REDUCED : OUT, ease: EASE } }}
      className={`[grid-area:1/1] ${here ? '' : 'pointer-events-none'} ${className}`}
    >
      {children}
    </m.div>
  );
}

/**
 * Bidding and playing as one screen: the table stays mounted (one element, one size) and only the who row, the dock
 * and the buttons change round it. Results and Summary are separate screens.
 */
export function Turn() {
  const { state, actions } = useApp();
  const g = state.game;
  const { r, n, pI, p, isD, allBid, forb, hookWarn, sum, cnt, diff, dealer, cap } = bidView(g);
  const playing = r.phase === 'playing';
  const rm = useReducedMotion();
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
  // Geometry cannot be switched in CSS, so it is chosen here. Only props change on rotation: the screen stays mounted
  // and keeps its bids, bidder and selection.
  const wide = useMediaQuery(MQ.wide);
  // The round table only where its slot holds it at its smallest scale (seats no smaller than the flat oval's).
  // Measured, not the page height: a Home Screen app loses ~100px to the status bar and home indicator.
  const [slot, slotH] = useBoxHeight<HTMLDivElement>();
  const round = slotH >= TD.full.H * minScale(n);
  const flight = useBidFlight('bid');
  const pick = (v: number, key: HTMLElement) => {
    const locked = isD && v === forb;
    // Measured here, before the bid lands: the turn moves on in the same update, and the flight is to this bidder.
    if (!locked) flight.launch(key, v, pI);
    actions.bid(v);
    if (locked) {
      setShake(v);
      setTimeout(() => setShake(null), 320);
    }
  };
  return (
    <>
      {flight.node}
      <RoundFrame
        hero
        r={r}
        fit
        aside={
          // Content height: a long name wraps instead of being cut. The old and new card share one grid cell, so
          // the slide moves transforms only and the cell follows the taller of the two.
          <div
            className={`mt-3 @h-short:mt-2 pane:mt-0 pane:flex pane:min-h-full pane:flex-col ${playing ? 'pane:justify-center' : 'pane:justify-end'}`}
          >
            <div className={`grid ${playing ? '' : '@h-[24rem]:hidden'}`}>
              <AnimatePresence initial={false}>
                {playing ? (
                  <Part key="play">
                    <HeroWho
                      p={g.players[r.firstPlayerIndex]}
                      kicker={t.play.leadsKicker}
                      tally={sum}
                      of={r.cards}
                    />
                  </Part>
                ) : (
                  <Part key="bid" className="grid">
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
                  </Part>
                )}
              </AnimatePresence>
            </div>
          </div>
        }
        bar={
          // The dock: everything a bidder touches sits in the thumb's reach, above the button.
          <div className="flex w-full flex-col gap-2.5 @h-short:gap-2 @h-tiny:gap-1.5 @h-[24rem]:gap-1">
            <div className="grid">
              {/* While playing the dock keeps its place in one column (unseen, inert), so the table's slot is the
                  same height in both phases; two panes size the table on their own, so there it goes. */}
              <m.div
                data-bid-dock
                initial={false}
                animate={
                  playing
                    ? { opacity: 0, transitionEnd: { visibility: 'hidden' } }
                    : { opacity: 1, visibility: 'visible' }
                }
                transition={{ duration: rm ? REDUCED : playing ? OUT : IN, ease: EASE }}
                aria-hidden={playing || undefined}
                {...(playing ? { inert: '' as const } : {})}
                className={`flex flex-col gap-2.5 [grid-area:1/1] @h-short:gap-2 @h-tiny:gap-1.5 @h-[24rem]:gap-1 ${playing ? 'pane:hidden' : ''}`}
              >
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
                  {/* The reason arrives with the key's lock instead of popping in; the row keeps its height. */}
                  <AnimatePresence initial={false}>
                    {reason && (
                      <m.span
                        key="why"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: rm ? REDUCED : 0.2, ease: EASE }}
                        className="block"
                      >
                        {reason}
                      </m.span>
                    )}
                  </AnimatePresence>
                </div>
                <BidKeys
                  max={r.cards}
                  label={t.bidding.bidFor(p.name)}
                  selected={r.bids[p.id]}
                  locked={isD && forb != null ? [forb] : []}
                  describedBy={reasonId}
                  shake={shake}
                  onPick={pick}
                />
              </m.div>
              <AnimatePresence initial={false}>
                {playing && (
                  <Part key="sum" className="self-center pane:self-end">
                    <p className="text-center text-17 leading-[1.4] tracking-[-0.015em] @h-short:text-15">
                      {t.play.summary(sum, r.cards)}
                    </p>
                  </Part>
                )}
              </AnimatePresence>
            </div>
            <div className="grid">
              <AnimatePresence initial={false}>
                {playing ? (
                  <Part key="play" className="flex items-center gap-3">
                    <m.button
                      type="button"
                      whileTap={PRESS_SM}
                      onClick={() => actions.phase('bidding', -1)}
                      aria-label={t.play.editBids}
                      className={`glass grid shrink-0 place-items-center !rounded-[var(--r-lg)] ${EDIT_SIZE}`}
                    >
                      {Icon.edit}
                    </m.button>
                    <PrimaryButton
                      className={`flex-1 ${BTN_H}`}
                      onClick={() => actions.phase('results')}
                    >
                      {t.play.enterResults}
                    </PrimaryButton>
                  </Part>
                ) : (
                  <Part key="bid">
                    {allBid && !hookWarn ? (
                      <PrimaryButton
                        className={`w-full ${BTN_H}`}
                        onClick={() => actions.phase('playing')}
                      >
                        {t.bidding.startPlaying}
                      </PrimaryButton>
                    ) : (
                      <PrimaryButton className={`w-full ${BTN_H}`} disabled>
                        {t.bidding.bidsIn(cnt, n)}
                      </PrimaryButton>
                    )}
                  </Part>
                )}
              </AnimatePresence>
            </div>
          </div>
        }
      >
        <Glass glow spot={false} className="flex min-h-0 flex-1 flex-col p-2 pb-2.5">
          <div ref={slot} className="-mx-2 flex min-h-0 flex-1 flex-col">
            <Table
              // One element under either name: the flight looks for `bid`, other code and tests for `play`.
              uid={playing ? 'play' : 'bid'}
              fit
              size={wide || round ? 'full' : 'mini'}
              big={wide}
              players={g.players}
              dir={g.direction}
              dealer={r.dealerIndex}
              // The short "1st" tag in both phases: the who row names the leader, and the long tag overruns the card.
              first={r.firstPlayerIndex}
              bids={r.bids}
              cur={playing ? undefined : pI}
              warn={
                !playing && hookWarn && r.bids[dealer.id] === undefined ? r.dealerIndex : undefined
              }
              onSeat={playing ? undefined : actions.pickSeat}
              noSeatAnim
              center={<SuitCenter trump={r.trump} cards={r.cards} big={wide} />}
            />
          </div>
          <p className="px-2 pb-0.5 pt-2.5 text-center tracking-[-0.01em] [text-wrap:balance] @h-short:sr-only">
            <DealLine g={g} r={r} />
          </p>
        </Glass>
      </RoundFrame>
    </>
  );
}
