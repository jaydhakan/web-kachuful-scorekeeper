import type { Identity, Team } from '@/games/ishaara/domain';
import { clue } from '@/games/ishaara/strings/clue';
import { FitWord } from '../board/FitWord';
import { Mark } from '../board/marks';

export { Mark };

/**
 * Fill and ink for each identity on the key. The teams also carry an outline in their own colour, so Sun, Moon and
 * blank part by edge and hue, not by three near-equal dark fills (ISH-F05); blank is flat and quiet.
 */
const FILL: Record<Identity, string> = {
  sun: 'bg-key-sun text-key-sun-ink',
  moon: 'bg-key-moon text-key-moon-ink',
  blank: 'bg-key-blank text-key-blank-ink',
  trap: 'bg-key-trap text-key-trap-ink',
};
const EDGE: Record<Identity, string> = {
  sun: 'shadow-[inset_0_0_0_1.5px_var(--key-sun-edge)]',
  moon: 'shadow-[inset_0_0_0_1.5px_var(--key-moon-edge)]',
  blank: '',
  trap: 'shadow-[inset_0_0_0_2px_var(--key-trap-ink)]',
};
export const TINT: Record<Identity, string> = {
  sun: `${FILL.sun} ${EDGE.sun}`,
  moon: `${FILL.moon} ${EDGE.moon}`,
  blank: FILL.blank,
  trap: `${FILL.trap} ${EDGE.trap}`,
};

/** This phone's own words: a heavier edge and weight, so the clue-giver finds them first (ISH-F17). */
const OWN: Record<Team, string> = {
  sun: 'shadow-[inset_0_0_0_3px_var(--key-sun-edge)] font-extrabold',
  moon: 'shadow-[inset_0_0_0_3px_var(--key-moon-edge)] font-extrabold',
};

/** The identity's ink, for a mark drawn on the plain page (a revealed card, a heading). */
export const INK: Record<Identity, string> = {
  sun: 'text-key-sun-ink',
  moon: 'text-key-moon-ink',
  blank: 'text-key-blank-ink',
  trap: 'text-key-trap-ink',
};

export function TeamPill({ team, name }: { team: Team; name: string | null }) {
  return (
    <p
      className={`inline-flex min-h-11 min-w-0 items-center gap-2.5 rounded-[22px] px-4 py-2 text-16 font-bold leading-tight ${TINT[team]}`}
    >
      <Mark id={team} className="h-4 w-4" />
      <span>{clue.pill(team, name)}</span>
    </p>
  );
}

/** How many of each identity are still face down. */
export function Counts({
  keyIds,
  revealed,
}: {
  keyIds: Identity[];
  revealed: Array<Identity | null>;
}) {
  const ids: Identity[] = ['sun', 'moon', 'blank', 'trap'];
  return (
    <ul aria-label={clue.countsLabel} className="flex flex-wrap gap-2">
      {ids.map((id) => (
        <li
          key={id}
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-14 font-bold uppercase ${TINT[id]}`}
        >
          <Mark id={id} className="h-3.5 w-3.5" />
          {/* Under 400px the mark names the identity, so the four chips stay on one line. */}
          <span className="sr-only [@media(min-width:400px)]:not-sr-only">{clue.count[id]} </span>
          {keyIds.filter((k, i) => k === id && revealed[i] === null).length}
        </li>
      ))}
    </ul>
  );
}

interface GridProps {
  words: string[];
  keyIds: Identity[];
  revealed: Array<Identity | null>;
  /** This phone's team: its words are drawn heavier. */
  team?: Team;
  /** Cards that can be tapped (the penalty pick); every other card is plain text. */
  pickable?: (i: number) => boolean;
  selected?: number | null;
  onPick?: (i: number) => void;
}

/**
 * The 5 × 5 key: identity by fill, edge and mark. A revealed word stays at full ink, struck through on the plain
 * page with its mark still in colour (ISH-F16). Rows share the height the screen gives them, within limits.
 */
export function KeyGrid({ words, keyIds, revealed, team, pickable, selected, onPick }: GridProps) {
  return (
    <ul
      aria-label={clue.keyLabel}
      className="grid min-h-0 flex-1 grid-cols-5 grid-rows-[repeat(5,minmax(2.75rem,7rem))] content-center gap-1.5 rail:grid-rows-[repeat(5,minmax(2.75rem,9rem))] dt:grid-rows-[repeat(5,minmax(2.75rem,11rem))] dt:gap-2.5"
    >
      {words.map((w, i) => {
        const id = keyIds[i];
        const done = revealed[i] !== null;
        const label = clue.card(w, id, done);
        const body = (
          <>
            <Mark id={id} className={`h-4 w-4 wide:h-5 wide:w-5 ${done ? INK[id] : ''}`} />
            <span
              className={`w-full text-13 uppercase leading-tight md:text-16 wide:text-18 dt:text-22 ${done ? 'line-through decoration-2' : ''}`}
            >
              <FitWord>{w}</FitWord>
            </span>
          </>
        );
        const look = done
          ? 'bg-key-bg text-key-text-2 font-semibold shadow-[inset_0_0_0_1px_var(--key-edge)]'
          : `${FILL[id]} ${team && id === team ? OWN[team] : `${EDGE[id]} font-bold`}`;
        const base = `flex h-full w-full flex-col items-center justify-center gap-1 rounded-[12px] px-1 py-1 text-center ${look}`;
        const on = selected === i;
        return (
          <li key={i} className="flex min-h-0">
            {pickable?.(i) ? (
              <button
                type="button"
                aria-pressed={on}
                aria-label={label}
                onClick={() => onPick?.(i)}
                className={`press ${base} ${on ? 'outline outline-[3px] outline-offset-2 [outline-color:var(--key-text)]' : ''}`}
              >
                {body}
              </button>
            ) : (
              <div aria-label={label} role="img" className={base}>
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
