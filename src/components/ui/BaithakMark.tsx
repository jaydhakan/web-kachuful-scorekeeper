import { useId } from 'react';

const ARCS = [
  'M20.65 9.72A25 25 0 0 1 43.35 9.72',
  'M54.28 20.65A25 25 0 0 1 54.28 43.35',
  'M9.72 43.35A25 25 0 0 1 9.72 20.65',
];

/**
 * Baithak's mark: a table with four seats around it. Painted from the theme (seats in the text colour, the near seat
 * and the table in the accent), so it reads on every background; decorative, the control around it carries the name.
 */
export function BaithakMark({ className = '' }: { className?: string }) {
  // React's ids carry colons, which some engines won't resolve inside url(#…).
  const id = 'bm' + useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 64" aria-hidden focusable="false" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--ga)' }} />
          <stop offset="1" style={{ stopColor: 'var(--gb)' }} />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="15" fill={`url(#${id})`} />
      <g fill="none" strokeWidth="7" strokeLinecap="round">
        {ARCS.map((d) => (
          <path key={d} d={d} stroke="currentColor" />
        ))}
        <path d="M43.35 54.28A25 25 0 0 1 20.65 54.28" style={{ stroke: 'var(--brand)' }} />
      </g>
    </svg>
  );
}
