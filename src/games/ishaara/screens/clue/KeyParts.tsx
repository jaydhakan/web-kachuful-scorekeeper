import type { ReactNode } from 'react';
import type { Identity, Team } from '@/games/ishaara/domain';
import { clue } from '@/games/ishaara/strings/clue';

const svg = (d: ReactNode, className: string) => (
  <svg viewBox="0 0 16 16" aria-hidden className={`inline-block shrink-0 ${className}`}>
    {d}
  </svg>
);

/** Identity is never colour alone: Sun a dot, Moon a crescent, blank stripes, the trap a cross. */
export function Mark({ id, className = 'h-3.5 w-3.5' }: { id: Identity; className?: string }) {
  if (id === 'sun') return svg(<circle cx="8" cy="8" r="5" fill="currentColor" />, className);
  if (id === 'moon')
    return svg(
      <path d="M10 2.2A6 6 0 1 0 10 13.8 4.4 4.4 0 0 1 10 2.2Z" fill="currentColor" />,
      className,
    );
  const line = { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const };
  if (id === 'blank')
    return svg(
      <>
        <line x1="3" y1="11" x2="8" y2="4" {...line} />
        <line x1="8" y1="12" x2="13" y2="5" {...line} />
      </>,
      className,
    );
  return svg(
    <>
      <line x1="4" y1="4" x2="12" y2="12" {...line} strokeWidth={2.2} />
      <line x1="12" y1="4" x2="4" y2="12" {...line} strokeWidth={2.2} />
    </>,
    className,
  );
}

const HATCH =
  '[background-image:repeating-linear-gradient(135deg,var(--key-blank-stripe)_0_7px,transparent_7px_15px)]';

/** Fill and ink for each identity on the key; the blank's hatch and the trap's outline carry it without colour. */
export const TINT: Record<Identity, string> = {
  sun: 'bg-key-sun text-key-sun-ink',
  moon: 'bg-key-moon text-key-moon-ink',
  blank: `bg-key-blank text-key-blank-ink ${HATCH}`,
  trap: 'bg-key-trap text-key-trap-ink shadow-[inset_0_0_0_2px_var(--key-trap-ink)]',
};

export function TeamPill({ team, name }: { team: Team; name: string | null }) {
  return (
    <p
      className={`inline-flex min-h-11 min-w-0 items-center gap-2.5 rounded-[22px] px-4 py-2 text-16 font-bold leading-tight ${TINT[team]}`}
    >
      <Mark id={team} />
      <span>{clue.pill(team, name)}</span>
    </p>
  );
}

/** How many of each identity the key holds, as in the round-2 design. */
export function Counts({ keyIds }: { keyIds: Identity[] }) {
  const ids: Identity[] = ['sun', 'moon', 'blank', 'trap'];
  return (
    <ul aria-label={clue.countsLabel} className="flex flex-wrap gap-2">
      {ids.map((id) => (
        <li
          key={id}
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-14 font-bold uppercase ${TINT[id]}`}
        >
          <Mark id={id} className="h-3 w-3" />
          {clue.count[id]} {keyIds.filter((k) => k === id).length}
        </li>
      ))}
    </ul>
  );
}

interface GridProps {
  words: string[];
  keyIds: Identity[];
  revealed: Array<Identity | null>;
  /** Cards that can be tapped (the penalty pick); every other card is plain text. */
  pickable?: (i: number) => boolean;
  selected?: number | null;
  onPick?: (i: number) => void;
}

/** The 5 × 5 key: identity by fill and mark, revealed words dimmed. */
export function KeyGrid({ words, keyIds, revealed, pickable, selected, onPick }: GridProps) {
  return (
    <ul aria-label={clue.keyLabel} className="grid grid-cols-5 gap-1.5">
      {words.map((w, i) => {
        const id = keyIds[i];
        const done = revealed[i] !== null;
        const label = clue.card(w, id, done);
        const body = (
          <>
            <Mark id={id} />
            <span className="w-full text-13 font-bold uppercase leading-tight [overflow-wrap:anywhere]">
              {w}
            </span>
          </>
        );
        const base = `flex min-h-[60px] w-full flex-col items-center justify-center gap-1 rounded-[12px] px-1 py-1.5 text-center ${TINT[id]}`;
        const on = selected === i;
        return (
          <li key={i} className="flex">
            {pickable?.(i) ? (
              <button
                type="button"
                aria-pressed={on}
                aria-label={label}
                onClick={() => onPick?.(i)}
                className={`press ${base} ${on ? 'shadow-[inset_0_0_0_3px_var(--key-text)]' : ''}`}
              >
                {body}
              </button>
            ) : (
              <div aria-label={label} role="img" className={`${base} ${done ? 'opacity-40' : ''}`}>
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
