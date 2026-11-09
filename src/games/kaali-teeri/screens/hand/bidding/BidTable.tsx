import { AnimatePresence, m } from 'framer-motion';
import type { ReactNode } from 'react';
import type { KtGame, KtHand } from '@/games/kaali-teeri/domain';
import { firstSpeaker } from '@/games/kaali-teeri/domain';
import { ktBidding } from '@/games/kaali-teeri/strings/bidding';
import { useBoxHeight } from '@/hooks/useBoxHeight';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  TD,
  dpx,
  minScale,
  seatPos,
  seatR,
  showNames,
  toPct,
  type TableSize,
} from '@/lib/tableGeometry';
import { MQ } from '@/theme/breakpoints';
import { Glass } from '@/components/ui/Glass';
import { Table, type SeatBadge } from '@/components/ui/Table';
import { SPRING_POP } from '@/components/ui/motion';

interface BidTableProps {
  uid: string;
  g: KtGame;
  h: KtHand;
  /** The seat with the turn light: whose call it is, or the winner picked in quick mode. */
  cur?: number;
  /** Each seat's standing bid, by player id. */
  bids?: Record<string, number>;
  /** Crown badges by player id: the high bidder, or the winner picked in quick mode. */
  badges?: Record<string, SeatBadge>;
  /** Seats whose last call was a pass. */
  passed?: number[];
  onSeat?: (k: number) => void;
  /** The felt's middle; `flat` is the short oval, with room for one line. */
  center: (flat: boolean) => ReactNode;
  children?: ReactNode;
}

/** The felt's middle: a kicker, the amount set big, and who holds it. Hidden from assistive tech: the dock says it. */
export function TableMiddle({
  kicker,
  amount,
  who,
  flat,
}: {
  kicker: string;
  amount: ReactNode;
  who: ReactNode;
  flat: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`flex items-center text-[var(--ctr-fg)] ${flat ? 'gap-2' : 'flex-col gap-0.5'}`}
    >
      {!flat && <span className="mono-label text-[0.6875rem] leading-4">{kicker}</span>}
      <m.span
        key={String(amount)}
        initial={{ opacity: 0.4, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_POP}
        className={`disp tick font-extrabold leading-none tracking-[-0.03em] ${flat ? 'text-28' : 'text-52'}`}
      >
        {amount}
      </m.span>
      <span className="max-w-[9rem] text-center text-14 font-bold leading-5 [overflow-wrap:anywhere]">
        {who}
      </span>
    </span>
  );
}

/** A solid chip, readable over an avatar in every theme; inline, as the main stylesheet is at its budget. */
export const SOLID = {
  background: 'var(--surface-2)',
  boxShadow: 'inset 0 0 0 1px var(--hairline-2), 0 2px 8px -2px var(--shade)',
};

/** A "Pass" chip where the seat's bid bubble would sit: on the avatar's outer edge, so the name below stays clear. */
function PassChip({ size, n, k, g }: { size: TableSize; n: number; k: number; g: KtGame }) {
  const at = toPct(size, seatPos(size, n, k, g.direction)),
    R = seatR(size, n),
    // Seats on the right edge put it on the felt side, so it never leaves the table's box.
    flip = at.x > 70;
  return (
    <m.span
      data-seat-pass
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.15 } }}
      transition={SPRING_POP}
      className="pointer-events-none absolute z-[3] whitespace-nowrap rounded-full px-2 text-13 font-bold leading-5 text-[var(--tx2)]"
      style={{
        ...SOLID,
        // Mostly outside the avatar, so the face stays readable.
        left: `calc(${at.x}% + ${dpx(flip ? -R : R)})`,
        top: `${at.y}%`,
        translate: flip ? '-80% -50%' : '-20% -50%',
      }}
    >
      {ktBidding.table.pass}
    </m.span>
  );
}

/** A veil over a seat whose last call was a pass, like a player sitting back; the log says it in words. */
function PassVeil({ size, n, k, g }: { size: TableSize; n: number; k: number; g: KtGame }) {
  const at = toPct(size, seatPos(size, n, k, g.direction)),
    R = seatR(size, n);
  return (
    <m.span
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.55 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none absolute z-[2] rounded-full"
      style={{
        left: `${at.x}%`,
        top: `${at.y}%`,
        width: dpx(2 * R),
        height: dpx(2 * R),
        translate: '-50% -50%',
        background: 'var(--bg)',
      }}
    />
  );
}

/** The bidding table: dealer, "Bids 1st", bids and passes on the seats, and whatever the step puts in the middle. */
export function BidTable({
  uid,
  g,
  h,
  cur,
  bids,
  badges,
  passed = [],
  onSeat,
  center,
  children,
}: BidTableProps) {
  const n = g.players.length;
  const wide = useMediaQuery(MQ.wide);
  // The round table only where its slot holds it at its smallest scale; measured, not the page height.
  const [slot, slotH] = useBoxHeight<HTMLDivElement>();
  const size: TableSize = wide || slotH >= TD.full.H * minScale(n) ? 'full' : 'mini';
  // The word needs the room of a round table with names; a crowded or flat one keeps only the veil (and the log).
  const chips = size !== 'mini' && showNames(n);
  return (
    <Glass glow spot={false} className="flex min-h-0 flex-1 flex-col p-2 pb-2.5">
      <div ref={slot} className="-mx-2 flex min-h-0 flex-1 flex-col">
        <Table
          uid={uid}
          fit
          size={size}
          big={wide}
          players={g.players}
          dir={g.direction}
          dealer={h.dealerIndex}
          first={firstSpeaker(g, h.index)}
          firstLabel={ktBidding.table.bidsFirst}
          cur={cur}
          bids={bids}
          badges={badges}
          onSeat={onSeat}
          noSeatAnim
          center={center(size === 'mini')}
        >
          <AnimatePresence>
            {passed
              .filter((k) => k !== cur)
              .map((k) => (
                <PassVeil key={'v' + k} size={size} n={n} k={k} g={g} />
              ))}
            {chips && passed.map((k) => <PassChip key={k} size={size} n={n} k={k} g={g} />)}
          </AnimatePresence>
        </Table>
      </div>
      {children}
    </Glass>
  );
}
