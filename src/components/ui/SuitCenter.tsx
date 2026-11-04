import type { Trump } from '@/domain';
import { TR } from '@/theme/trumps';
import { t } from '@/strings';

interface SuitCenterProps {
  trump: Trump;
  cards: number;
  big?: boolean;
}

// The trump's halo: full strength where the theme glows, none in the flat themes (--trump-glow-amt is 0% there).
export const HALO = 'color-mix(in srgb, var(--trump) calc(var(--trump-glow-amt) * 4), transparent)';
export const onFelt = (trump: Trump) =>
  trump === 'hearts' || trump === 'diamonds' ? 'var(--suit-red-felt)' : 'var(--ctr-fg)';

export const SuitCenter = ({ trump, cards, big }: SuitCenterProps) => (
  <>
    <div
      className={`relative leading-none ${big ? 'text-52 @[17rem]:text-64 @[19rem]:text-72 @[21rem]:text-96' : 'text-19 @[17rem]:text-22 @[18rem]:text-26 @[19.5rem]:text-34 @[26rem]:text-40 @[38rem]:text-52'}`}
      style={{ color: onFelt(trump), textShadow: `0 0 ${big ? 20 : 18}px ${HALO}` }}
    >
      {/* A medallion ring around the trump, drawn only by themes that paint .suit-ring. */}
      <span aria-hidden className={`suit-ring ${big ? 'is-big' : ''}`} />
      {TR[trump].sym}
      {big && (
        // The wide glow is painted once on a copy of the glyph and only its opacity pulses.
        <span
          aria-hidden
          className="suit-glow absolute inset-0"
          style={{ textShadow: `0 0 52px ${HALO}, 0 0 90px var(--trump-glow)` }}
        >
          {TR[trump].sym}
        </span>
      )}
    </div>
    <div
      className={`${big ? 'text-14 @[38rem]:text-16' : 'text-13 @[26rem]:text-14 @[38rem]:text-16'} text-[var(--ctr-fg)] whitespace-nowrap font-medium tracking-[0.01em]`}
    >
      {big ? t.suit.big(TR[trump].name, cards) : t.suit.cards(cards)}
    </div>
  </>
);
