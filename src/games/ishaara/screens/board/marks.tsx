import type { Identity, Team } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';

/** Identity is never colour alone: Sun a dot, Moon a crescent, blank two strokes, the trap a cross. */
export function Mark({ id, className = 'h-[1em] w-[1em]' }: { id: Identity; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`inline-block shrink-0 ${className}`}>
      {id === 'sun' && <circle cx="12" cy="12" r="8" fill="currentColor" />}
      {id === 'moon' && (
        <path d="M15.5 3.5a9 9 0 1 0 0 17 7.2 7.2 0 0 1 0-17Z" fill="currentColor" />
      )}
      {id === 'blank' && (
        <path
          d="M10 5 4 19M20 5l-6 14"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {id === 'trap' && (
        <path
          d="m5 5 14 14M19 5 5 19"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}

const HATCH =
  '[background-image:repeating-linear-gradient(135deg,var(--word-stripe)_0_7px,transparent_7px_15px)]';

/** Fill and ink per identity; blank and trap carry stripes (contrast.test.ts measures ink over them). */
export const FACE: Record<Identity | 'down', string> = {
  down: 'bg-word-card text-word-card-ink shadow-[inset_0_0_0_1.5px_var(--word-edge)]',
  sun: 'bg-team-sun text-team-sun-ink shadow-[inset_0_0_0_1.5px_var(--word-edge)]',
  moon: 'bg-team-moon text-team-moon-ink shadow-[inset_0_0_0_1.5px_var(--word-edge)]',
  blank: `${HATCH} bg-word-blank text-word-blank-ink shadow-[inset_0_0_0_1.5px_var(--word-edge)]`,
  trap: `${HATCH} bg-word-trap text-word-trap-ink shadow-[inset_0_0_0_1.5px_var(--word-edge)]`,
};

export const TEAM_FILL: Record<Team, string> = {
  sun: 'bg-team-sun text-team-sun-ink',
  moon: 'bg-team-moon text-team-moon-ink',
};

/** "● Sun's turn": the team's colour, its shape and its name. */
export function TeamPill({
  team,
  label,
  className = '',
}: {
  team: Team;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-17 font-bold ${TEAM_FILL[team]} ${className}`}
    >
      <Mark id={team} />
      {label ?? s.team[team]}
    </span>
  );
}

/** "● Sun 5 left" on the page's own surface: the shape carries the team, the text stays in the page's ink. */
export function TeamCount({
  team,
  n,
  className = '',
}: {
  team: Team;
  n: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className}`}>
      <Mark id={team} className="h-3.5 w-3.5" />
      {s.board.left(team, n)}
    </span>
  );
}
