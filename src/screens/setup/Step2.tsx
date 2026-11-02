import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import type { Person } from '@/state/registry';
import { lacksEmail } from './seatLook';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Table } from '@/components/ui/Table';
import { Icon } from '@/components/ui/Icons';
import { EASE, PRESS } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { SetupFrame, TableSlot } from './SetupFrame';
import { useSeatPlayer } from './useSeatPlayer';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';

/** Seating the table. No text field here: names are typed in the Add player sheet, clear of the keyboard. */
export function Step2() {
  const { su, actions, n, seats, tgt, filled, prompt, signedIn, free, seat } = useSeatPlayer();
  const [drop, setDrop] = useState<number | null>(null);
  const nextId = useId();
  const recent = free.slice(0, 10);
  // Seats also fill from the sheet, so the newly taken one is found by comparing, not told.
  const prev = useRef(seats);
  useEffect(() => {
    const k = seats.findIndex((s, i) => s && !prev.current[i]);
    const wasOpen = prev.current.some((s) => !s);
    prev.current = seats;
    if (k >= 0) setDrop(k);
    // The last seat closes the sheet and takes its opener with it, so focus goes on to Next.
    if (wasOpen && !seats.some((s) => !s) && document.activeElement === document.body)
      document.getElementById(nextId)?.focus();
  }, [seats, nextId]);
  const pick = (r: Person) =>
    // Signed in, someone with no email is never seated without one: the sheet opens on their email.
    signedIn && lacksEmail(r)
      ? actions.openSheet({ type: 'addPlayer', name: r.displayName })
      : seat(r.displayName, r);

  return (
    <SetupFrame
      step={2}
      title={t.setup.step2Title}
      fit
      bar={
        <PrimaryButton
          id={nextId}
          className="w-full"
          disabled={tgt >= 0}
          onClick={() => actions.setupPatch({ step: 3, dealer: 0 })}
        >
          {t.common.next}
        </PrimaryButton>
      }
      aside={
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
              onClick={() => actions.openSheet({ type: 'addPlayer' })}
              className="mt-3 w-full !h-12 !rounded-2xl !text-16 @h-[45rem]:mt-2 @h-[45rem]:!h-11"
            >
              {Icon.plus}
              {t.setup.addPlayer}
            </PrimaryButton>
          )}
        </div>
      }
    >
      <TableSlot players={n}>
        <Table
          uid="su2"
          fit
          n={n}
          dir={su.dir}
          players={seats}
          dealer={seats[0] ? 0 : undefined}
          first={seats[1] ? 1 : undefined}
          hl={tgt >= 0 ? tgt : undefined}
          dropIdx={drop}
          noSeatAnim={filled > 0}
          arrowFrom={tgt > 0 && seats[tgt - 1] ? tgt - 1 : undefined}
          arrowTo={tgt > 0 && seats[tgt - 1] ? tgt : undefined}
          onSeat={(k) => seats[k] && actions.openSheet({ type: 'seat', k })}
          center={<div className="text-13 text-[var(--ctr-fg)]">{t.setup.seated(filled, n)}</div>}
        />
      </TableSlot>
    </SetupFrame>
  );
}
