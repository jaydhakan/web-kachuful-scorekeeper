import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { EASE, SPRING } from '@/components/ui/motion';
import { say } from '@/platform/notice';
import { seatInvites as s } from '@/strings/seatInvites';
import { dropInvite, useSeatInvites, type SeatInvite } from '@/sync/seatInvites';
import { markTold, useCardsShown } from '@/sync/seatInviteSignals';
import { declineInvite, type Answer } from '@/sync/seatInvitesLive';
import { joinInvite } from './join';
import { SeatMap, spadesSeat } from './SeatMap';

/** How long "This table has filled up" stays before the card goes. */
const FILLED_MS = 2400;

/** A button in an invite's row: Join is the accent fill, the rest are glass. */
export function InviteButton({
  accent,
  busy,
  className = '',
  children,
  onClick,
}: {
  accent?: boolean;
  busy?: boolean;
  className?: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={busy ? undefined : onClick}
      aria-disabled={busy || undefined}
      aria-busy={busy || undefined}
      className={`press relative isolate inline-flex min-h-[46px] items-center justify-center rounded-[16px] px-4 text-15 font-bold ${
        accent ? 'mat-cta mat-cta-on mat-tone-accent text-ink-on-accent' : 'mat-fill-s'
      } ${className}`}
    >
      {accent && <span aria-hidden className="mat-fill absolute inset-0 -z-10 rounded-[inherit]" />}
      {children}
    </button>
  );
}

/** Who sent it, where, and your seat; `seatLabel` is the game's own word for the seat ("You give Sun's clues"). */
function Heading({ inv, seatLabel, id }: { inv: SeatInvite; seatLabel?: string; id: string }) {
  const seat = spadesSeat(inv.seat);
  const line = [
    inv.table.name,
    inv.partner ? s.partner(inv.partner.name) : null,
    seatLabel ?? null,
  ].filter(Boolean);
  return (
    <div className="flex items-center gap-3">
      <Avatar
        p={inv.from}
        className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full text-24"
      />
      <div className="min-w-0 flex-1">
        <p id={id} className="text-16 font-bold leading-tight [overflow-wrap:anywhere]">
          {s.invitedYou(inv.from.name)}
        </p>
        <p className="mt-0.5 text-14 text-[var(--tx2)] [overflow-wrap:anywhere]">
          {line.join(' · ')}
        </p>
      </div>
      {seat !== null && <SeatMap seat={seat} taken={inv.table.seatsTaken} />}
    </div>
  );
}

export interface InviteCardProps {
  invite: SeatInvite;
  /** The game's own words for the seat, after the table name. */
  seatLabel?: string;
  /** Instead of the default (accept, then open the game). */
  onJoin?: (inv: SeatInvite) => Promise<Answer> | Answer;
}

/**
 * One invite on a game's home: the host, the table, your seat, Decline and Join. Declining collapses the card; a
 * seat that has gone says "This table has filled up" for a moment, then the card goes.
 */
export function InviteCard({ invite: inv, seatLabel, onJoin = joinInvite }: InviteCardProps) {
  const [busy, setBusy] = useState<'join' | 'decline' | null>(null);
  const [state, setState] = useState<'ok' | 'filled' | 'error'>('ok');
  const titleId = useId();
  useEffect(() => {
    if (state !== 'filled') return;
    const t = setTimeout(() => dropInvite(inv.id), FILLED_MS);
    return () => clearTimeout(t);
  }, [state, inv.id]);

  const run = async (what: 'join' | 'decline') => {
    setBusy(what);
    setState('ok');
    const r = what === 'join' ? await onJoin(inv) : await declineInvite(inv);
    setBusy(null);
    if (r === 'ok' && what === 'decline') say(s.declined(inv.from.name));
    if (r !== 'ok') setState(r);
  };

  return (
    <article
      aria-labelledby={titleId}
      className="glass relative isolate overflow-hidden p-3.5 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_45%,transparent)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_70%)]"
      />
      <Heading inv={inv} seatLabel={seatLabel} id={titleId} />
      {state === 'filled' ? (
        <p role="status" className="mt-3 flex min-h-[46px] items-center text-15 font-bold">
          {s.filled}
        </p>
      ) : (
        <>
          {state === 'error' && (
            <p role="alert" className="mt-2 text-14 font-medium text-[var(--warn)]">
              {s.failed}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <InviteButton busy={!!busy} onClick={() => void run('decline')}>
              {busy === 'decline' ? s.declining : s.decline}
            </InviteButton>
            <InviteButton accent busy={!!busy} onClick={() => void run('join')}>
              {busy === 'join' ? s.joining : s.join}
            </InviteButton>
          </div>
        </>
      )}
    </article>
  );
}

/**
 * The Invites list at the top of a game's home (`game`: `'ishaara'`, `'spades'`); nothing when there are none.
 * While it is on screen the banner leaves this game's invites to it.
 */
export function SeatInviteCards({
  game,
  seatLabel,
  onJoin,
  className = '',
}: {
  game: string;
  seatLabel?: (inv: SeatInvite) => string | undefined;
  onJoin?: InviteCardProps['onJoin'];
  className?: string;
}) {
  const list = useSeatInvites(game);
  const rm = useReducedMotion();
  const headId = useId();
  useCardsShown(game);
  useEffect(() => markTold(list.map((i) => i.id)), [list]);
  if (!list.length) return null;
  return (
    <div role="region" aria-labelledby={headId} className={`w-full ${className}`}>
      <h2 id={headId} className="mono-label mb-1.5 px-1 text-13 text-[var(--tx2)]">
        {s.listTitle}
      </h2>
      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((inv) => (
            <m.li
              key={inv.id}
              layout={!rm}
              initial={rm ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={
                rm
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : { opacity: 0, x: -40, transition: { duration: 0.24, ease: EASE } }
              }
              transition={rm ? { duration: 0.15 } : SPRING}
            >
              <InviteCard invite={inv} seatLabel={seatLabel?.(inv)} onJoin={onJoin} />
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
