import type { Trump } from '@/domain';
import { TR } from '@/theme/trumps';
import { t } from '@/strings';

interface SuitCenterProps {
  trump: Trump;
  cards: number;
  big?: boolean;
}

export const SuitCenter = ({ trump, cards, big }: SuitCenterProps) => (
  <>
    <div
      className={`relative leading-none ${big ? 'text-52 @[17rem]:text-64 @[19rem]:text-72 @[21rem]:text-96' : 'text-26 @[17rem]:text-34 @[26rem]:text-40 @[38rem]:text-52'}`}
      style={{ color: TR[trump].col, textShadow: `0 0 ${big ? 20 : 18}px var(--accent)` }}
    >
      {TR[trump].sym}
      {big && (
        // The wide glow is painted once on a copy of the glyph and only its opacity pulses.
        <span
          aria-hidden
          className="suit-glow absolute inset-0"
          style={{ textShadow: '0 0 52px var(--accent), 0 0 90px var(--glow)' }}
        >
          {TR[trump].sym}
        </span>
      )}
    </div>
    <div
      className={`${big ? 'text-14 text-[var(--tx)] @[38rem]:text-16' : 'text-13 text-[var(--tx2)] @[26rem]:text-14 @[38rem]:text-16'} whitespace-nowrap font-medium tracking-[0.01em]`}
    >
      {big ? t.suit.big(TR[trump].name, cards) : t.suit.cards(cards)}
    </div>
  </>
);
