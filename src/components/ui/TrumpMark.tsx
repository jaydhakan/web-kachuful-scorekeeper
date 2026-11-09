import type { Trump } from '@/games/kachuful/domain';
import { TR } from '@/theme/trumps';

/**
 * A later round's trump symbol, with a slot for a small trump card that a theme with deck art paints over it
 * (themes.css, .trump-mark). The slot takes no space, so no theme moves the layout, and the symbol stays the text.
 */
export const TrumpMark = ({
  trump,
  color = TR[trump].col,
  inline,
}: {
  trump: Trump;
  color?: string;
  /** Where the card must stay within its line of text (beside a number, or above the card count). */
  inline?: boolean;
}) => (
  <span
    data-suit={trump}
    className={`trump-mark relative ${inline ? 'is-inline' : ''}`}
    style={{ color }}
  >
    <i aria-hidden data-suit={trump} className="trump-face trump-mini" />
    <span className="trump-glyph inline-block">{TR[trump].sym}</span>
  </span>
);
