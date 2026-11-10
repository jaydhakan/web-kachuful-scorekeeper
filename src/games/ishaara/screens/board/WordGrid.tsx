import { m, useReducedMotion } from 'framer-motion';
import type { Identity } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';
import { SPRING_POP } from '@/components/ui/motion';
import { FACE, Mark } from './marks';

export interface WordGridProps {
  words: string[];
  /** Per card: its identity once turned, else null (the table never knows a face-down card's). */
  revealed: Array<Identity | null>;
  /** Picks are off (no clue yet, a penalty pending, not connected, sending): cards stay readable but inert. */
  disabled?: boolean;
  selected?: number | null;
  /** The card just turned, lifted and ringed for the reveal moment. */
  lit?: number | null;
  onPick?: (card: number) => void;
  /** Read-only (the win screen's key): plain cells, no buttons. */
  readOnly?: boolean;
  className?: string;
  /** Extra props per card button (the desk's roving tab stop). */
  cellProps?: (card: number) => { tabIndex: number; 'data-roving': string };
}

const CELL =
  'relative flex min-h-11 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[14px] px-1 text-center font-bold uppercase leading-[1.1] tracking-[0.01em] [overflow-wrap:anywhere] @[26rem]:text-15 @[40rem]:text-18 @[40rem]:rounded-[18px] @[48rem]:text-22 text-13';

/**
 * The 5 × 5 board as real buttons ("RIVER, face down"), sized by its container so the phone, a phone on its side and
 * the desk can each give it whatever box they have.
 */
export function WordGrid({
  words,
  revealed,
  disabled,
  selected = null,
  lit = null,
  onPick,
  readOnly,
  className = '',
  cellProps,
}: WordGridProps) {
  const rm = useReducedMotion();
  return (
    <div className={`@container h-full w-full ${className}`}>
      <ul
        aria-label={readOnly ? s.win.keyLabel : s.board.grid}
        className="grid h-full grid-cols-5 grid-rows-5 gap-1.5 @[40rem]:gap-2.5"
      >
        {words.map((w, i) => {
          const id = revealed[i] ?? null;
          const word = w.toUpperCase();
          const sel = selected === i;
          const face = (
            <>
              {id && <Mark id={id} className="h-3.5 w-3.5 @[40rem]:h-5 @[40rem]:w-5" />}
              <span>{word}</span>
            </>
          );
          if (readOnly)
            return (
              <li key={i} className={`${CELL} ${FACE[id ?? 'down']}`}>
                <span className="sr-only">{s.board.card(word, id)}</span>
                <span aria-hidden className="contents">
                  {face}
                </span>
              </li>
            );
          return (
            <li key={i} className="relative min-h-0 min-w-0">
              <m.button
                {...cellProps?.(i)}
                type="button"
                // Turned cards stay in the grid as buttons, so the order reads the same, but they can't be picked.
                aria-disabled={disabled || id !== null || undefined}
                aria-pressed={id === null ? sel : undefined}
                aria-label={`${s.board.card(word, id)}${sel ? `, ${s.board.selected}` : ''}`}
                onClick={() => !disabled && id === null && onPick?.(i)}
                initial={false}
                animate={rm ? { opacity: 1 } : { scale: sel || lit === i ? 1.04 : 1, opacity: 1 }}
                whileTap={disabled || id !== null || rm ? undefined : { scale: 0.95 }}
                transition={SPRING_POP}
                className={`${CELL} h-full w-full ${FACE[id ?? 'down']} ${sel || lit === i ? 'z-10 outline outline-[3px] outline-offset-2 outline-[var(--focus)]' : ''} ${disabled && id === null ? 'cursor-default' : ''}`}
              >
                {/* Each turn of a card fades in its new face: opacity only, so reduced motion keeps it. */}
                <m.span
                  key={id ?? 'down'}
                  initial={id ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  aria-hidden
                  className="flex flex-col items-center gap-0.5"
                >
                  {face}
                </m.span>
              </m.button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
