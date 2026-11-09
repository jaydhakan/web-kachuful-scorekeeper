import { AnimatePresence, m } from 'framer-motion';
import type { Seat } from '@/people';
import { Glass } from '@/components/ui/Glass';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Table } from '@/components/ui/Table';
import { EASE, PRESS } from '@/components/ui/motion';
import { ktSetup as s } from '@/games/kaali-teeri/strings/setup';
import { SetupFrame, TableSlot, useSetup } from './SetupFrame';
import { TakeOut } from './TakeOut';

/** A squared-up deck in the table's centre: three backs, slightly fanned. */
export const DeckStack = () => (
  <div aria-hidden className="relative h-[3.15rem] w-8">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="absolute left-0 top-0"
        style={{ transform: `translate(${i * 2}px, ${-i * 2}px) rotate(${(i - 1) * 4}deg)` }}
      >
        <PlayingCard rank="3" suit="spades" face="down" size="xs" />
      </span>
    ))}
  </div>
);

/** Setup 3: who deals the first hand (tap a seat, or Random), who bids first, and what to take out. */
export default function Dealer() {
  const { su, actions } = useSetup();
  const n = su.n,
    seats = su.seats as Seat[];
  const dealer = seats[su.dealer],
    first = seats[(su.dealer + 1) % n];
  if (!dealer || !first) return null;
  const pick = (k: number) => {
    if (k === su.dealer) return;
    actions.setupDealer(k);
    actions.vib();
  };
  return (
    <SetupFrame
      step={3}
      title={s.step3Title}
      bar={
        <PrimaryButton className="w-full" onClick={actions.beginGame}>
          {s.deal}
        </PrimaryButton>
      }
      aside={
        <Glass spot={false} className="flex flex-col gap-2 px-4 py-3.5 pane:mt-1">
          <AnimatePresence mode="popLayout" initial={false}>
            <m.div
              key={su.dealer}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE }}
              aria-live="polite"
              className="flex flex-col gap-1 text-18 leading-[1.35] tracking-[-0.01em] [text-wrap:balance]"
            >
              <div>{s.deals(dealer.name)}</div>
              <div>{s.bidsFirstThen(first.name, su.dir)}</div>
            </m.div>
          </AnimatePresence>
          <TakeOut n={n} />
          <div className="mt-1 flex items-center gap-3">
            <m.button
              type="button"
              whileTap={PRESS}
              aria-label={s.randomLabel}
              onClick={() => {
                actions.randomDealer();
                actions.vib();
              }}
              className="glass inline-flex min-h-12 shrink-0 items-center gap-1.5 !rounded-full px-4 text-16 font-medium"
            >
              {s.random}
            </m.button>
            <span className="text-13 leading-[1.35] text-[var(--tx2)]">{s.tapHint}</span>
          </div>
        </Glass>
      }
    >
      <TableSlot players={n}>
        <Table
          uid="kt-su3"
          fit
          n={n}
          dir={su.dir}
          players={seats}
          dealer={su.dealer}
          first={(su.dealer + 1) % n}
          firstLabel={s.bidsFirst}
          noSeatAnim
          onSeat={pick}
          center={<DeckStack />}
        />
      </TableSlot>
    </SetupFrame>
  );
}
