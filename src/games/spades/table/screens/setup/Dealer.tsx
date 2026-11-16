import { AnimatePresence, m } from 'framer-motion';
import { useMemo, useRef } from 'react';
import { nextSeat, teamOf, type Seat as SeatK } from '@/games/spades/domain';
import { spTable } from '@/games/spades/strings/table';
import { useSeatDrag } from '@/components/seating/useSeatDrag';
import type { Seat } from '@/people';
import { Glass } from '@/components/ui/Glass';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Table, type SeatBadge } from '@/components/ui/Table';
import { EASE, PRESS } from '@/components/ui/motion';
import { SpSetupFrame, TableSlot, useSetup } from './SetupFrame';

const s = spTable.setup;

const BADGE: Record<'a' | 'b', SeatBadge> = {
  a: {
    icon: 'A',
    label: spTable.teamA,
    style: { background: 'var(--team-sun)', color: 'var(--team-sun-ink)' },
  },
  b: {
    icon: 'B',
    label: spTable.teamB,
    style: { background: 'var(--team-moon)', color: 'var(--team-moon-ink)' },
  },
};

/** Setup 2: who deals the first hand (tap a seat, or Random); drag seats to change partners. */
export default function Dealer() {
  const { su, actions } = useSetup();
  const seats = su.seats as Seat[];
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useSeatDrag(wrap, seats, actions.setupSwap, { vib: actions.vib });
  const players = useMemo(() => seats.map((q, k) => ({ ...q, id: `seat-${k}` })), [seats]);
  const badges = useMemo(
    () => Object.fromEntries(players.map((p, k) => [p.id, BADGE[teamOf(k as SeatK)]])),
    [players],
  );
  const dealer = seats[su.dealer],
    first = seats[nextSeat(su.dealer)];
  if (!dealer || !first) return null;
  const pick = (k: number) => {
    if (k === su.dealer || drag.justDragged()) return;
    actions.setupDealer(k);
    actions.vib();
  };
  return (
    <SpSetupFrame
      step={2}
      title={s.step2Title}
      bar={
        <PrimaryButton className="w-full" onClick={actions.beginGame}>
          {s.start}
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
              <div>{s.bidsFirst(first.name)}</div>
            </m.div>
          </AnimatePresence>
          <p className="text-14 text-[var(--tx2)]">{s.partnersNote}</p>
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
      <TableSlot
        ref={wrap}
        players={4}
        className="relative touch-none select-none"
        {...drag.handlers}
      >
        <Table
          uid="sp-su2"
          fit
          n={4}
          dir={su.dir}
          players={players}
          dealer={su.dealer}
          first={nextSeat(su.dealer)}
          firstLabel={s.firstLabel}
          badges={badges}
          noSeatAnim
          onSeat={pick}
        />
        {drag.ghost}
      </TableSlot>
    </SpSetupFrame>
  );
}
