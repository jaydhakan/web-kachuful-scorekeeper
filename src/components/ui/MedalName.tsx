import { medals, type MedalNo } from '@/strings/medals';

export interface MedalMark {
  medal: MedalNo;
  /** Last month's medal, kept until three players qualify: no sheen, a quieter glyph. */
  defending: boolean;
}

/**
 * A player's name as the table shows it (REWARDS-PLAN §6.7): plain without a medal; with one, metal letters, the
 * medal after the name and its title for screen readers. `slipping` lays a hairline crack over the letters.
 */
export function MedalName({
  name,
  mark,
  slipping = false,
  glyph = true,
  className = '',
}: {
  name: string;
  mark?: MedalMark | null;
  slipping?: boolean;
  /** Left out where the medal already shows beside the name (a seat's ring). */
  glyph?: boolean;
  className?: string;
}) {
  if (!mark) return <span className={className}>{name}</span>;
  const { medal, defending } = mark;
  const sheen = !defending && medal < 3;
  return (
    <span className={className}>
      <span className={`medal-${medal} ${sheen || slipping ? 'medal-sheen' : ''}`}>
        {name}
        {slipping && (
          <svg
            aria-hidden
            className="medal-crack"
            viewBox="0 0 100 20"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M58 1 L54 7 L61 10 L55 15 L59 19"
              stroke="var(--tx)"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </span>
      {glyph && (
        <span aria-hidden className={`ml-1 ${defending ? 'opacity-60' : ''}`}>
          {medals.glyph[medal]}
        </span>
      )}
      <span className="sr-only">{`, ${medals.sr(medal, defending)}`}</span>
    </span>
  );
}
