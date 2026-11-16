import { AnimatePresence, m } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { SeatInviteRing } from '@/components/seat-invites/SeatInviteRing';
import { SPRING, SPRING_POP } from '@/components/ui/motion';
import { vibrate } from '@/hooks/useHaptics';
import type { SpWho } from '../../domain';
import { online as o } from '../../strings/online';
import type { SeatInviteMark } from '../state/tableContext';
import type { Place } from './seats';

const POS: Record<Place, string> = {
  S: 'left-1/2 top-[88%]',
  N: 'left-1/2 top-[12%]',
  W: 'left-[15%] top-1/2',
  E: 'left-[85%] top-1/2',
};

export interface ChairProps {
  place: Place;
  who: SpWho | null;
  invite: SeatInviteMark | null;
  ready: boolean;
  present: boolean;
  me: boolean;
  /** This chair holds the host. */
  hosts: boolean;
  band: 'partner' | 'opponent' | null;
  /** The viewer is the host: an empty chair offers Invite, an invited one Cancel. */
  viewerHosts: boolean;
  /** The person just arrived: their avatar pops in. */
  arrived: boolean;
  /** Bumped when an invite here was declined: the chair shakes once. */
  shake: number;
  dealer: boolean;
  disabled: boolean;
  onInvite: () => void;
  onSit: () => void;
  onCancel: () => void;
}

const AV = 'grid h-14 w-14 place-items-center rounded-full text-28';

function Band({ band }: { band: 'partner' | 'opponent' | null }) {
  if (!band) return null;
  const us = band === 'partner';
  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-px text-13 font-bold ${
        us
          ? 'bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent-tx)]'
          : 'bg-[color-mix(in_srgb,var(--tx)_10%,transparent)] text-[var(--tx2)]'
      }`}
    >
      {us ? o.lobby.partner : o.lobby.opponent}
    </span>
  );
}

/**
 * One of the lobby's four chairs: empty (Invite for the host, Sit here for anyone else), invited (a dimmed avatar in
 * a turning ring, "Invited…"), or taken (the avatar, with a green ring once ready). The avatar carries a layout id,
 * so Shuffle partners glides it to its new chair.
 */
export function Chair(p: ChairProps) {
  const place = o.lobby.place[p.place];
  let body;
  if (p.who) {
    const band = p.band === 'partner' ? o.lobby.partner : p.band ? o.lobby.opponent : '';
    const label = p.me ? o.lobby.you : p.who.name;
    body = (
      <div
        role="group"
        aria-label={o.lobby.seatAria(
          p.hosts ? `${label}, ${o.lobby.host}` : label,
          p.ready,
          !p.present,
          band,
        )}
        className="flex flex-col items-center"
      >
        <m.span
          layoutId={`sp-chair-${p.who.userId}`}
          initial={p.arrived ? { scale: 0.5, opacity: 0 } : false}
          animate={{ scale: 1, opacity: p.present ? 1 : 0.55 }}
          transition={SPRING_POP}
          className="relative"
        >
          <Avatar p={p.who} className={AV} />
          <AnimatePresence>
            {p.ready && (
              <m.i
                key="ready"
                aria-hidden
                data-ready=""
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={SPRING_POP}
                className="pointer-events-none absolute -inset-[5px] rounded-full shadow-[inset_0_0_0_3px_var(--success)]"
              />
            )}
          </AnimatePresence>
          {p.dealer && (
            <m.span
              aria-hidden
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={SPRING_POP}
              className="mat-dealer absolute -right-2 -top-1 grid h-6 min-w-6 place-items-center rounded-full px-1 text-13 font-extrabold"
            >
              D
            </m.span>
          )}
        </m.span>
        <span
          aria-hidden
          className="mt-1 max-w-full [overflow-wrap:anywhere] text-13 font-semibold"
        >
          {p.me ? o.lobby.you : p.who.name}
          {p.hosts && ` · ${o.lobby.host}`}
        </span>
        {!p.present ? (
          <span aria-hidden className="text-13 text-[var(--tx2)]">
            {o.lobby.away}
          </span>
        ) : (
          <span aria-hidden>
            <Band band={p.band} />
          </span>
        )}
      </div>
    );
  } else if (p.invite) {
    const name = p.invite.name;
    const face = { emoji: p.invite.emoji, color: p.invite.color };
    body = (
      <div className="flex flex-col items-center">
        {p.viewerHosts ? (
          <button
            type="button"
            onClick={p.onCancel}
            aria-label={o.lobby.invitedAria(name)}
            className="press-sm grid h-14 w-14 place-items-center rounded-full"
          >
            <SeatInviteRing>
              <Avatar p={face} className={AV} />
            </SeatInviteRing>
          </button>
        ) : (
          <span role="img" aria-label={o.lobby.invitedGuestAria(name)}>
            <SeatInviteRing>
              <Avatar p={face} className={AV} />
            </SeatInviteRing>
          </span>
        )}
        <span
          aria-hidden
          className="mt-1 max-w-full [overflow-wrap:anywhere] text-13 font-semibold"
        >
          {name}
        </span>
        <span aria-hidden className="text-13 text-[var(--tx2)]">
          {o.lobby.invited}
        </span>
      </div>
    );
  } else {
    const host = p.viewerHosts;
    body = (
      <div className="flex flex-col items-center">
        <m.button
          type="button"
          onPointerDown={() => vibrate(6)}
          onClick={host ? p.onInvite : p.onSit}
          aria-disabled={p.disabled || undefined}
          aria-label={host ? o.lobby.inviteAria(place) : o.lobby.sitAria(place)}
          whileTap={{ scale: 0.94 }}
          transition={SPRING}
          className={`grid h-14 w-14 place-items-center rounded-full text-26 aria-disabled:opacity-50 ${
            host
              ? 'border-2 border-dashed border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] text-[var(--accent-tx)]'
              : 'border-2 border-dashed border-[color-mix(in_srgb,var(--tx)_24%,transparent)] text-[var(--tx2)]'
          }`}
        >
          <span aria-hidden>{host ? '+' : ''}</span>
        </m.button>
        <span aria-hidden className="mt-1 text-13 text-[var(--tx2)]">
          {host ? o.lobby.invite : o.lobby.sitHere}
        </span>
        <span aria-hidden>
          <Band band={p.band} />
        </span>
      </div>
    );
  }
  return (
    <div
      data-place={p.place}
      className={`absolute w-24 -translate-x-1/2 -translate-y-1/2 text-center ${POS[p.place]}`}
    >
      <m.div
        key={p.shake}
        animate={p.shake ? { x: [0, -7, 7, -4, 0] } : undefined}
        transition={{ duration: 0.38 }}
      >
        {body}
      </m.div>
    </div>
  );
}
