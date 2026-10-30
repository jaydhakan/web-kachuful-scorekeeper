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
      className={`leading-none ${big ? 'suit-glow text-96' : 'text-34'}`}
      style={{ color: TR[trump].col, textShadow: big ? undefined : '0 0 18px var(--accent)' }}
    >
      {TR[trump].sym}
    </div>
    <div
      className={`${big ? 'text-14 text-[var(--tx)]' : 'text-13 text-[var(--tx2)]'} whitespace-nowrap font-medium tracking-[0.01em]`}
    >
      {big ? t.suit.big(TR[trump].name, cards) : t.suit.cards(cards)}
    </div>
  </>
);
