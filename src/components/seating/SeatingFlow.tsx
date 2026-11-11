import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Direction } from '@/people';
import type { Person } from '@/state/registry';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Table } from '@/components/ui/Table';
import { Icon } from '@/components/ui/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { EASE, PRESS } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { t } from '@/strings';
import { lacksEmail } from './seatLook';
import type { Seating } from './useSeating';

/** Seats whose chips a game shows once they are filled: who deals, who goes first and that tag's word. */
export interface SeatBadges {
  dealer?: number;
  first?: number;
  /** The "1st" tag's long form where there is room (e.g. "Bids 1st"). */
  firstLabel?: string;
}

/**
 * The seating controls: who the next seat is, one-tap chips for people this device knows, and Add player. No text
 * field here: names are typed in the Add player form, clear of the keyboard.
 */
export function SeatingPicker({
  seating: { tgt, prompt, signedIn, free, seat },
  onAdd,
  onNeedsEmail,
}: {
  seating: Seating;
  /** Opens the Add player form. */
  onAdd: () => void;
  /** Signed in, a known person with no email: open the form on their email. */
  onNeedsEmail: (name: string) => void;
}) {
  const recent = free.slice(0, 10);
  const pick = (r: Person) =>
    // Signed in, someone with no email is never seated without one.
    signedIn && lacksEmail(r) ? onNeedsEmail(r.displayName) : seat(r.displayName, r);
  return (
    <div className="flex flex-col">
      <AnimatePresence mode="wait">
        <m.div
          key={prompt}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="mt-4 min-h-8 text-21 font-bold leading-[1.25] tracking-[-0.02em] [text-wrap:balance] @h-[45rem]:mt-0 @h-short:text-19 land:!mt-0 wide:mb-1"
        >
          {prompt}
        </m.div>
      </AnimatePresence>
      {tgt >= 0 && !recent.length && (
        <p className="mt-2 text-13 text-[var(--tx2)]">{t.setup.recentHint}</p>
      )}
      {tgt >= 0 && recent.length > 0 && (
        // One row that scrolls sideways, so a long list never pushes Add player off screen.
        <div
          role="group"
          aria-label={t.setup.recentNames}
          className="scroll-thin edge-fade -mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5 pb-1 @h-[45rem]:mt-1.5 @h-[45rem]:pb-0 wide:flex-wrap wide:overflow-visible"
        >
          {recent.map((r, i) => (
            <m.button
              key={r.id}
              type="button"
              {...stagger(i)}
              whileTap={PRESS}
              onClick={() => pick(r)}
              className="glass inline-flex min-h-12 shrink-0 items-center gap-1.5 whitespace-nowrap !rounded-full pl-2 pr-4 text-16 font-medium @h-[45rem]:min-h-11"
            >
              <Avatar
                p={r}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-18"
              />
              {r.displayName}
            </m.button>
          ))}
        </div>
      )}
      {tgt >= 0 && (
        <PrimaryButton
          tone="glass"
          onClick={onAdd}
          className="mt-3 w-full !h-12 !rounded-2xl !text-16 @h-[45rem]:mt-2 @h-[45rem]:!h-11"
        >
          {Icon.plus}
          {t.setup.addPlayer}
        </PrimaryButton>
      )}
    </div>
  );
}

/** The table being seated: the next seat lit, an arrow from the seat before it, and each new player dropping in. */
export function SeatingTable({
  uid,
  seating: { n, seats, tgt, filled },
  dir,
  badges = {},
  onSeatTap,
  nextId,
  center,
}: {
  uid: string;
  seating: Seating;
  dir: Direction;
  badges?: SeatBadges;
  /** A filled seat was tapped (to rename, restyle or clear it). */
  onSeatTap: (k: number) => void;
  /** The button that moves on: it takes focus when the last seat fills from a sheet that closed. */
  nextId?: string;
  center?: ReactNode;
}) {
  const [drop, setDrop] = useState<number | null>(null);
  // Seats also fill from the sheet, so the newly taken one is found by comparing, not told.
  const prev = useRef(seats);
  useEffect(() => {
    const k = seats.findIndex((s, i) => s && !prev.current[i]);
    const wasOpen = prev.current.some((s) => !s);
    prev.current = seats;
    if (k >= 0) setDrop(k);
    // The last seat closes the sheet and takes its opener with it, so focus goes on to Next.
    if (nextId && wasOpen && !seats.some((s) => !s) && document.activeElement === document.body)
      document.getElementById(nextId)?.focus();
  }, [seats, nextId]);
  const shown = (k?: number) => (k != null && seats[k] ? k : undefined);
  return (
    <Table
      uid={uid}
      fit
      n={n}
      dir={dir}
      players={seats}
      dealer={shown(badges.dealer)}
      first={shown(badges.first)}
      firstLabel={badges.firstLabel}
      hl={tgt >= 0 ? tgt : undefined}
      dropIdx={drop}
      noSeatAnim={filled > 0}
      arrowFrom={tgt > 0 && seats[tgt - 1] ? tgt - 1 : undefined}
      arrowTo={tgt > 0 && seats[tgt - 1] ? tgt : undefined}
      onSeat={(k) => seats[k] && onSeatTap(k)}
      center={
        center ?? <div className="text-13 text-[var(--ctr-fg)]">{t.setup.seated(filled, n)}</div>
      }
    />
  );
}
