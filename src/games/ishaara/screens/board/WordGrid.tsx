import { m, useReducedMotion } from 'framer-motion';
import { useLayoutEffect, useRef, type RefObject } from 'react';
import { stamp } from '@/fx/stamp';
import { anim, OUT, reducedMotion } from '@/fx/waapi';
import type { Identity } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';
import { EASE, REDUCED, SPRING_POP } from '@/components/ui/motion';
import { FACE, Mark } from './marks';
import { FitWord } from './FitWord';
import type { Moment } from './Notes';

export interface WordGridProps {
  words: string[];
  /** Per card: its identity once turned, else null (the table never knows a face-down card's). */
  revealed: Array<Identity | null>;
  /** Picks are off (no clue yet, a penalty pending, not connected, sending): cards stay readable but inert. */
  disabled?: boolean;
  /** The board is waiting (on a clue or a penalty pick): face-down cards dim so they read as not live. */
  dim?: boolean;
  selected?: number | null;
  /** The card just turned, lifted and ringed for the reveal moment. */
  lit?: number | null;
  /** What the lit card meant: a wrong pick settles with a shake, the trap drops and dims the board around it. */
  verdict?: Moment['kind'] | null;
  /** I2: a clue for 3+ just fully found: those cards pulse in the order they were found. */
  meld?: { cards: number[]; key: number } | null;
  /** At the end: what was face down before the key was shown; those cards turn in a diagonal wave. */
  waveFrom?: Array<Identity | null> | null;
  onPick?: (card: number) => void;
  /** A tap on a card while picks are off, so the board can say why. */
  onBlocked?: () => void;
  /** Read-only (the win screen's key): plain cells, no buttons. */
  readOnly?: boolean;
  className?: string;
  /** Extra props per card button (the desk's roving tab stop). */
  cellProps?: (card: number) => { tabIndex: number; 'data-roving': string };
}

const CELL =
  'relative flex min-h-11 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[14px] px-1 text-center font-bold uppercase leading-[1.1] tracking-[0.01em] @[26rem]:text-15 @[40rem]:text-18 @[40rem]:rounded-[18px] @[48rem]:text-22 @[64rem]:text-28 @[80rem]:text-32 text-13';
const MARK = 'h-3.5 w-3.5 @[40rem]:h-5 @[40rem]:w-5 @[64rem]:h-7 @[64rem]:w-7';

/** The ring that leaves a turned card, in the colour of what it was. */
const RING: Record<Identity, string> = {
  sun: 'border-team-sun',
  moon: 'border-team-moon',
  blank: 'border-word-blank',
  trap: 'border-word-trap',
};
/**
 * Three marks that must not look alike (ISH-F18): keyboard focus keeps the global gold ring; the picked card gets a
 * heavier ring in the text colour; the card just turned is outlined in the colour of what it was.
 */
const PICKED = 'z-10 outline outline-[4px] outline-offset-2 outline-[var(--tx)]';
const LIT: Record<Identity, string> = {
  sun: 'outline-team-sun',
  moon: 'outline-team-moon',
  blank: 'outline-[var(--tx2)]',
  trap: 'outline-word-trap-edge',
};
/** The end-of-game wave: each card waits for its diagonal (row + column), 40ms apart. */
const WAVE_STEP = 0.04;

/**
 * The 5 × 5 board as real buttons ("RIVER, face down"), sized by its container so the phone, a phone on its side and
 * the desk can each give it whatever box they have.
 */
export function WordGrid({
  words,
  revealed,
  disabled,
  dim,
  selected = null,
  lit = null,
  verdict = null,
  waveFrom = null,
  meld = null,
  onPick,
  onBlocked,
  readOnly,
  className = '',
  cellProps,
}: WordGridProps) {
  const rm = useReducedMotion();
  const trapLit = lit !== null && verdict === 'trap';
  const grid = useRef<HTMLUListElement>(null);
  useMeldPulse(grid, meld);
  return (
    <div className={`@container relative h-full w-full ${className}`}>
      {trapLit && !readOnly && <TrapFx grid={grid} />}
      <ul
        ref={grid}
        aria-label={readOnly ? s.win.keyLabel : s.board.grid}
        className="grid h-full grid-cols-5 grid-rows-5 gap-1.5 @[40rem]:gap-2.5"
      >
        {words.map((w, i) => {
          const id = revealed[i] ?? null;
          const word = w.toUpperCase();
          const sel = selected === i;
          const face = (
            <>
              {id && <Mark id={id} className={MARK} />}
              <FitWord>{word}</FitWord>
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
          const isLit = lit === i;
          const live = !disabled && id === null;
          const waved = !!waveFrom && waveFrom[i] === null && id !== null;
          const wrong = isLit && (verdict === 'other' || verdict === 'blank');
          // The lit card flips on its vertical axis; the wave turns the rest at the end. Reduced: a cross-fade.
          const turn = isLit || waved;
          const delay = waved ? (Math.floor(i / 5) + (i % 5)) * WAVE_STEP + (trapLit ? 0.6 : 0) : 0;
          return (
            <li
              key={i}
              className={`relative min-h-0 min-w-0 transition-opacity duration-300 ${
                (dim && id === null) || (trapLit && !isLit) ? 'opacity-55' : ''
              }`}
            >
              <m.button
                {...cellProps?.(i)}
                type="button"
                // Turned cards stay in the grid as buttons, so the order reads the same, but they can't be picked.
                aria-disabled={disabled || id !== null || undefined}
                aria-pressed={id === null ? sel : undefined}
                aria-label={`${s.board.card(word, id)}${sel ? `, ${s.board.selected}` : ''}`}
                onClick={() => (live ? onPick?.(i) : id === null && onBlocked?.())}
                initial={false}
                animate={
                  rm
                    ? { opacity: 1 }
                    : {
                        scale: sel || isLit ? (trapLit && isLit ? 0.98 : 1.04) : 1,
                        y: trapLit && isLit ? 6 : 0,
                        x: wrong ? [0, -5, 4, -2, 0] : 0,
                        opacity: 1,
                      }
                }
                whileHover={live && !rm ? { y: -3 } : undefined}
                whileTap={!live || rm ? undefined : { scale: 0.95 }}
                transition={
                  wrong
                    ? { x: { delay: 0.38, duration: 0.36, ease: EASE }, default: SPRING_POP }
                    : SPRING_POP
                }
                className={`${CELL} h-full w-full ${FACE[id ?? 'down']} ${sel ? PICKED : isLit && id ? `z-10 outline outline-[3px] outline-offset-2 ${LIT[id]}` : ''} ${live ? 'fine:hover:shadow-[inset_0_0_0_2px_var(--focus)]' : 'cursor-default'}`}
              >
                <m.span
                  key={id ?? 'down'}
                  initial={
                    id && turn && !rm ? { opacity: 0, rotateY: 90 } : id ? { opacity: 0 } : false
                  }
                  animate={{ opacity: 1, rotateY: 0 }}
                  transition={
                    rm || !turn
                      ? { duration: rm ? REDUCED : 0.25, delay: rm ? 0 : delay }
                      : { duration: 0.34, ease: EASE, delay }
                  }
                  aria-hidden
                  className="flex flex-col items-center gap-0.5"
                >
                  {face}
                </m.span>
              </m.button>
              {isLit && verdict === 'trap' && <TrapStamp />}
              {isLit && id && !rm && (
                <m.span
                  key={`ring${id}`}
                  data-reveal-ring={id}
                  aria-hidden
                  initial={{ opacity: 0.9, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.3 }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
                  className={`pointer-events-none absolute inset-0 rounded-[14px] border-[3px] @[40rem]:rounded-[18px] ${RING[id]}`}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** I2: each found card swells and settles, 80ms apart in the order found (on the cell, not its button). */
function useMeldPulse(grid: RefObject<HTMLUListElement>, meld: WordGridProps['meld']) {
  useLayoutEffect(() => {
    if (!meld) return;
    const runs = meld.cards.map((c, k) =>
      anim(
        grid.current?.children[c],
        [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }],
        { duration: 260, delay: 420 + k * 80, easing: OUT },
      ),
    );
    return () => runs.forEach((r) => r.cancel());
  }, [grid, meld]);
}

/**
 * I1, trapped: the board jitters once (3px, four steps, 240ms) and one red flash crosses it (0 to .3 to 0 over 200ms,
 * a single flash, far under photosensitivity limits), with the glitch. Reduced motion: neither; the stamp and the
 * note carry it.
 */
function TrapFx({ grid }: { grid: RefObject<HTMLUListElement> }) {
  const flash = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    void import('@/fx/sound').then((m) => m.cue('glitch'));
    if (reducedMotion()) return;
    const runs = [
      anim(
        grid.current,
        [0, 3, -3, 2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 240, delay: 380, easing: 'steps(4, end)' },
      ),
      anim(flash.current, [{ opacity: 0 }, { opacity: 0.3 }, { opacity: 0 }], {
        duration: 200,
        delay: 380,
        easing: 'linear',
      }),
    ];
    return () => runs.forEach((r) => r.cancel());
  }, [grid]);
  return (
    <span
      ref={flash}
      aria-hidden
      data-trap-flash
      className="pointer-events-none absolute -inset-2 z-20 rounded-[18px] bg-[var(--danger)] opacity-0"
    />
  );
}

/** "TRAPPED" stamped on the trap card as it lands. */
function TrapStamp() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(
    () => stamp(ref.current, { angle: -10, delay: 420, base: 'translate(-50%,-50%)' }).cancel,
    [],
  );
  return (
    <span
      ref={ref}
      data-trapped
      className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rotate-[-10deg] whitespace-nowrap rounded-lg border-[3px] border-current bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-2 py-0.5 text-15 font-extrabold uppercase tracking-[0.08em] text-[var(--neg-tx)] @[40rem]:text-22"
    >
      {s.board.trapped}
    </span>
  );
}
