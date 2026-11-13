/** The podium step for the top three: gold, silver, bronze. */
export const PODIUM_BG = {
  1: 'bg-gold-gradient-v',
  2: 'bg-silver-gradient-v',
  3: 'bg-bronze-gradient-v',
} as const;

/** A place's colour: gold, silver and bronze for the top three, the text colour after. */
export const rankTone = (rank: number) =>
  rank === 1
    ? 'text-[var(--gold-tx)]'
    : rank === 2
      ? 'text-rank-silver'
      : rank === 3
        ? 'text-rank-bronze'
        : 'text-[var(--tx)]';
