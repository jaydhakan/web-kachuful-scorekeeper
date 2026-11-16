import type { CSSProperties, Ref } from 'react';
import { artToken, cardKey, isRed } from '@/lib/cards';
import { t } from '@/strings';
import type { Card } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';

/** Type for each size: the hand's cards (46–72px), the table's (52–64px), and the summary's minis. */
const TYPE = {
  hand: { ix: 'text-16', ixBig: 'text-18', pip: 'text-30' },
  slot: { ix: 'text-15', ixBig: 'text-16', pip: 'text-28' },
  mini: { ix: 'text-13', ixBig: 'text-13', pip: 'text-13' },
} as const;

export const cardName = (c: Card) => t.card.name(c.rank, c.suit);

interface SpCardProps {
  card: Card | null;
  /** Face down shows the back; changing it turns the card over (a 3D flip, a cross-fade under reduced motion). */
  down?: boolean;
  size?: keyof typeof TYPE;
  /** A card at least this wide uses the larger index. */
  big?: boolean;
  className?: string;
  style?: CSSProperties;
  /** The flipping layer, for a flight that turns the card mid-air. */
  flipRef?: Ref<HTMLSpanElement>;
  label?: boolean;
}

/**
 * One Spades card. The same three layers as `PlayingCard` (the theme's flat face, its stand-in, the photo art; a
 * theme with deck art covers the flat face), but the flat face carries corner indices, because a fanned hand shows
 * only each card's left strip. Width comes from `--cw` on the element or a class.
 */
export function SpCard({
  card,
  down = false,
  size = 'hand',
  big = false,
  className = '',
  style,
  flipRef,
  label = false,
}: SpCardProps) {
  const ty = TYPE[size];
  const ix = big ? ty.ixBig : ty.ix;
  const key = card ? cardKey(card.rank, card.suit) : undefined;
  const ink = card && isRed(card.suit) ? 'text-card-red' : 'text-card-ink';
  const a11y = label
    ? { role: 'img', 'aria-label': card && !down ? cardName(card) : s.hand.faceDown }
    : { 'aria-hidden': true as const };
  return (
    <span
      {...a11y}
      data-face={down ? 'down' : 'up'}
      className={`sp-card relative block aspect-[5/7] select-none [perspective:700px] ${className}`}
      style={style}
    >
      <span
        ref={flipRef}
        className="sp-flip absolute inset-0 rounded-[11%_/_7.9%] [transform-style:preserve-3d]"
        style={{ transform: down ? 'rotateY(180deg)' : 'none' }}
      >
        <span className="sp-face absolute inset-0 overflow-hidden rounded-[inherit] shadow-[0_2px_6px_-1px_color-mix(in_srgb,var(--shade)_45%,transparent)] [backface-visibility:hidden]">
          {card && (
            <>
              <span
                className={`card-flat absolute inset-0 bg-card-face font-bold leading-none ${ink}`}
              >
                <span className={`absolute left-[7%] top-[4%] flex flex-col items-center ${ix}`}>
                  <span className="tracking-[-0.04em]">{card.rank}</span>
                  <span>{s.sym[card.suit]}</span>
                </span>
                <span className={`absolute inset-0 grid place-items-center ${ty.pip}`}>
                  {s.sym[card.suit]}
                </span>
                <span
                  className={`absolute bottom-[4%] right-[7%] flex rotate-180 flex-col items-center ${ix}`}
                >
                  <span className="tracking-[-0.04em]">{card.rank}</span>
                  <span>{s.sym[card.suit]}</span>
                </span>
              </span>
              <i data-card={key} className="card-standin card-art absolute inset-0" />
              <i
                className="card-photo card-art absolute inset-0"
                style={{ backgroundImage: `var(${artToken(card.rank, card.suit)}, none)` }}
              />
            </>
          )}
        </span>
        <span className="sp-back absolute inset-0 overflow-hidden rounded-[inherit] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <i className="card-art absolute inset-0 bg-card-back shadow-[inset_0_0_0_2px_var(--card-back-edge),0_2px_6px_-1px_color-mix(in_srgb,var(--shade)_45%,transparent)]" />
        </span>
      </span>
    </span>
  );
}
