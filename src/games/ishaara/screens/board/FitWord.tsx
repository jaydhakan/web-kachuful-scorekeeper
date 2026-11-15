import { useLayoutEffect, useRef, useState } from 'react';

/** How far a word on one line may be narrowed; past this it reads as a squeeze, so it takes two lines instead. */
const MIN_SCALE = 0.75;
/** Two lines may narrow a little further, then shrink evenly rather than spill out of the card. */
const MIN_SCALE_TWO = 0.6;

/**
 * Where a long word splits onto two lines: at its own hyphen or space when it has one near the middle, else in the
 * middle with a hyphen added (WICKET- / KEEPER). The halves are separate text, so no line ever ends mid-letter-run.
 */
export function splitWord(word: string): [string, string] {
  const mid = word.length / 2;
  let best = -1;
  for (let i = 1; i < word.length - 1; i++)
    if (/[-\s]/.test(word[i]) && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  if (best > 0 && Math.abs(best - mid) <= word.length / 4)
    return [word.slice(0, word[best] === '-' ? best + 1 : best), word.slice(best + 1)];
  const cut = Math.ceil(mid);
  return [`${word.slice(0, cut)}-`, word.slice(cut)];
}

/**
 * A board word that always fits its card: on one line, narrowed when it is a little long (WEDDING on a small
 * phone); on two lines when narrowing would squeeze it past 75% (KARVA-CHAUTH). A transform, so the card never
 * changes size and the type stays on the scale.
 */
export function FitWord({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [two, setTwo] = useState(false);
  // The word's width on one line, kept while it shows on two, to know when one line fits again.
  const oneW = useRef(0);
  useLayoutEffect(() => {
    const el = ref.current;
    // The card: a grid cell, or the word's wrapper's box outside a grid.
    const box = el?.closest('li') ?? el?.parentElement?.parentElement;
    if (!el || !box) return;
    const fit = () => {
      el.style.transform = '';
      const room = box.clientWidth - 8;
      const need = el.scrollWidth;
      if (!two) oneW.current = need;
      else if (oneW.current * MIN_SCALE <= room) return setTwo(false);
      if (!(need > room && need > 0)) return;
      const k = room / need;
      if (!two && k < MIN_SCALE && children.length > 3) return setTwo(true);
      // Even shrink below the floor (a 16-letter custom word on a 360 phone) keeps it whole.
      const floor = two ? MIN_SCALE_TWO : MIN_SCALE;
      el.style.transform = k >= floor ? `scaleX(${k})` : `scale(${k / floor}) scaleX(${floor})`;
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [children, two]);
  if (two) {
    const [a, b] = splitWord(children);
    return (
      <span
        ref={ref}
        className="inline-flex origin-center flex-col whitespace-nowrap leading-[1.05]"
      >
        <span>{a}</span>
        <span>{b}</span>
      </span>
    );
  }
  return (
    <span ref={ref} className="inline-block origin-center whitespace-nowrap">
      {children}
    </span>
  );
}
