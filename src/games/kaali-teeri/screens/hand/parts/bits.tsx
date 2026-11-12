import { m, useReducedMotion } from 'framer-motion';
import {
  cloneElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import type { CardRef, KtHand } from '@/games/kaali-teeri/domain';
import { kp } from '@/games/kaali-teeri/strings/play';
import { Icon } from '@/components/ui/Icons';
import { PlayingCard, type CardSize } from '@/components/ui/PlayingCard';
import type { SeatBadge } from '@/components/ui/Table';
import { SPRING, REDUCED } from '@/components/ui/motion';
import { TR } from '@/theme/trumps';
import { t } from '@/strings';

export type Role = 'bidder' | 'partner';

/** The bidder, or a player who played a called card; null for a defender (or a partner not revealed yet). */
export const roleOf = (h: Pick<KtHand, 'bidder' | 'playedBy'>, id: string): Role | null =>
  h.bidder === id ? 'bidder' : h.playedBy.includes(id) ? 'partner' : null;

// The icons size to the text and take its colour (the crown's own gold would vanish on the team fill).
const inline = (el: ReactElement) =>
  cloneElement(el as ReactElement<{ className?: string }>, {
    className: 'inline-block shrink-0 h-[1.05em] w-[1.05em] align-[-0.15em]',
  });
export const ROLE_ICON = { bidder: inline(Icon.crownInline), partner: inline(Icon.link) };
/** The bidding team's colours: inline, as they are one token pair used in a handful of places. */
export const TEAM_FILL: CSSProperties = { background: 'var(--kt-bid)', color: 'var(--kt-bid-ink)' };

/** Crown and the word for the bidder, link and the word for a partner: never colour alone. */
export function RoleBadge({ kind, className = '' }: { kind: Role; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-13 font-extrabold uppercase leading-4 tracking-[0.005em] ${className}`}
      style={TEAM_FILL}
    >
      {ROLE_ICON[kind]}
      {kp.role[kind]}
    </span>
  );
}

/** A quieter pill beside a role: "2× · two cards", "Sweep". */
export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-ov/[.08] px-2 py-0.5 text-13 font-bold leading-4">
      {children}
    </span>
  );
}

/**
 * The seat badges for the shared table: crown on the bidder, link on each revealed partner. `wait` holds back the
 * called cards (by index) whose reveal is still on its way to the seat.
 */
export function seatBadges(
  h: Pick<KtHand, 'bidder' | 'playedBy'>,
  wait?: ReadonlySet<number>,
): Record<string, SeatBadge> {
  const out: Record<string, SeatBadge> = {};
  h.playedBy.forEach((id, i) => {
    if (id != null && !wait?.has(i))
      out[id] = { icon: ROLE_ICON.partner, label: kp.role.partner, style: TEAM_FILL };
  });
  if (h.bidder) out[h.bidder] = { icon: ROLE_ICON.bidder, label: kp.role.bidder, style: TEAM_FILL };
  return out;
}

/** "Ace of hearts, first played": what assistive tech reads for a called card. */
export const cardText = (c: CardRef): string =>
  t.card.name(c.rank, c.suit) + (c.copy !== undefined ? `, ${kp.copy[String(c.copy)]}` : '');

/** "A♥" in the suit's colour, with its copy in small type when both copies are in play. */
export function CardName({ c, copy = true }: { c: CardRef; copy?: boolean }) {
  return (
    <>
      <span aria-hidden className="whitespace-nowrap">
        {c.rank}
        <span style={{ color: TR[c.suit].col }}>{TR[c.suit].sym}</span>
        {copy && c.copy !== undefined && (
          <span className="ml-1 text-13 font-medium text-[var(--tx2)]">
            {kp.copy[String(c.copy)]}
          </span>
        )}
      </span>
      <span className="sr-only">{cardText(c)}</span>
    </>
  );
}

/**
 * A called card that turns face up once someone has played it. The turn is a rotation of two backface-hidden faces;
 * under reduced motion the faces cross-fade instead.
 */
export function FlipCard({ c, up, size, at }: FlipCardProps) {
  const rm = useReducedMotion();
  const face = (show: boolean, back: boolean) =>
    rm
      ? { opacity: show ? 1 : 0, transition: { duration: REDUCED } }
      : { rotateY: (show ? 0 : 180) * (back ? -1 : 1), opacity: 1, transition: SPRING };
  // One-off 3D values stay inline, off the shared stylesheet.
  const side: CSSProperties = { backfaceVisibility: 'hidden' };
  return (
    <span ref={at} aria-hidden className="relative inline-block" style={{ perspective: 600 }}>
      <m.span initial={false} animate={face(!up, true)} className="relative grid" style={side}>
        <PlayingCard rank={c.rank} suit={c.suit} face="down" size={size} />
        <span
          className={`absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-card-face font-extrabold text-card-ink ${size === 'md' || size === 'lg' ? 'text-24' : 'text-13'}`}
          style={{ width: '42%', aspectRatio: '1' }}
        >
          ?
        </span>
      </m.span>
      <m.span
        initial={false}
        animate={face(up, false)}
        className="absolute inset-0 grid"
        style={side}
      >
        <PlayingCard rank={c.rank} suit={c.suit} face="up" size={size} />
      </m.span>
    </span>
  );
}

interface FlipCardProps {
  c: CardRef;
  up: boolean;
  size: CardSize;
  /** The card's box, for whatever needs to know where it is on screen. */
  at?: Ref<HTMLSpanElement>;
}
