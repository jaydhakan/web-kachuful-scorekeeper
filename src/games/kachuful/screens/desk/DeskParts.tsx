import type { CSSProperties } from 'react';
import type { Trump } from '@/games/kachuful/domain';
import { TR } from '@/theme/trumps';
import { dpx } from '@/lib/tableGeometry';
import { Avatar as UiAvatar, type Face } from '@/components/ui/Avatar';
import { t } from '@/strings';
import { HALO, onFelt } from '@/components/ui/SuitCenter';

// Lifted to src/components/desk for every game's large-screen UI; re-exported so Kachuful's imports stay put.
export {
  DeskPage,
  Delta,
  Eyebrow,
  GhostButton,
  Kbd,
  KeyHints,
  PageHead,
  Ticker,
} from '@/components/desk/DeskParts';

interface AvatarProps {
  p: Face;
  /** Diameter in px. */
  s: number;
  className?: string;
  style?: CSSProperties;
}

export const Avatar = ({ p, s, className = '', style }: AvatarProps) => (
  <UiAvatar
    p={p}
    className={`grid shrink-0 place-items-center rounded-full border-2 border-ov/20 shadow-[0_8px_22px_color-mix(in_srgb,var(--shade)_45%,transparent)] ${className}`}
    style={{ width: s, height: s, fontSize: Math.round(s * 0.55), ...style }}
  />
);

export { rankTone } from '@/components/ui/rankTones';

export const totalTone = (v: number) => (v < 0 ? 'text-[var(--neg-tx)]' : '');

/**
 * The trump in the middle of the large-screen table, sized in table units (--s) rather than by the box's width: the
 * wide oval is short for its width, so a width-based size would reach the seats when the table is small.
 */
export const TableCenter = ({ trump, cards }: { trump: Trump; cards: number }) => (
  <>
    <div
      className="relative leading-none"
      style={{
        color: onFelt(trump),
        textShadow: `0 0 20px ${HALO}`,
        fontSize: `max(2rem, ${dpx(72)})`,
      }}
    >
      <span aria-hidden className="suit-ring" />
      {TR[trump].sym}
      <span
        aria-hidden
        className="suit-glow absolute inset-0"
        style={{ textShadow: `0 0 52px ${HALO}, 0 0 90px var(--trump-glow)` }}
      >
        {TR[trump].sym}
      </span>
    </div>
    <div
      className="whitespace-nowrap font-medium tracking-[0.01em] text-[var(--ctr-fg)]"
      style={{ fontSize: `max(0.8125rem, ${dpx(15)})` }}
    >
      {t.suit.big(TR[trump].name, cards)}
    </div>
  </>
);
