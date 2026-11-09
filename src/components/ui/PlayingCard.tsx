import type { CSSProperties } from 'react';
import { artToken, cardKey, isRed, type Rank, type Suit } from '@/lib/cards';
import { TR } from '@/theme/trumps';
import { t } from '@/strings';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg';

const BOX: Record<CardSize, string> = {
  xs: 'w-8',
  sm: 'w-12',
  md: 'w-[4.5rem]',
  lg: 'w-28',
};
const RANK_TYPE: Record<CardSize, string> = {
  xs: 'text-13',
  sm: 'text-16',
  md: 'text-24',
  lg: 'text-36',
};
const PIP_TYPE: Record<CardSize, string> = {
  xs: 'text-13',
  sm: 'text-18',
  md: 'text-30',
  lg: 'text-48',
};

interface PlayingCardProps {
  rank: Rank;
  suit: Suit;
  face?: 'up' | 'down';
  size?: CardSize;
  className?: string;
}

/**
 * One card, painted in three layers: the theme's flat face (rank and pip, so it is never blank), the theme's stand-in
 * for this card (`.card-standin`, painted only by a theme that has them) and this card's photo art
 * (`--art-card-<rank>-<suit>`, `none` until a real file exists). Each layer covers the one below once it loads.
 */
export function PlayingCard({
  rank,
  suit,
  face = 'up',
  size = 'md',
  className = '',
}: PlayingCardProps) {
  const key = cardKey(rank, suit);
  const up = face === 'up';
  return (
    <span
      role="img"
      aria-label={up ? t.card.name(rank, suit) : t.card.faceDown}
      data-card={up ? key : undefined}
      data-face={face}
      className={`playing-card relative inline-block aspect-[5/7] shrink-0 overflow-hidden rounded-[7.2%_/_5.15%] shadow-[0_4px_10px_-4px_color-mix(in_srgb,var(--shade)_50%,transparent)] ${BOX[size]} ${className}`}
    >
      {up ? (
        <>
          <span
            aria-hidden
            className={`card-flat absolute inset-0 flex flex-col items-center justify-center bg-card-face font-bold leading-none ${isRed(suit) ? 'text-card-red' : 'text-card-ink'}`}
          >
            <span className={RANK_TYPE[size]}>{rank}</span>
            <span className={PIP_TYPE[size]}>{TR[suit].sym}</span>
          </span>
          <i aria-hidden data-card={key} className="card-standin card-art absolute inset-0" />
          <i
            aria-hidden
            className="card-photo card-art absolute inset-0"
            style={{ backgroundImage: `var(${artToken(rank, suit)}, none)` } as CSSProperties}
          />
        </>
      ) : (
        <i
          aria-hidden
          className="card-art absolute inset-0 bg-card-back shadow-[inset_0_0_0_2px_var(--card-back-edge)]"
        />
      )}
    </span>
  );
}
