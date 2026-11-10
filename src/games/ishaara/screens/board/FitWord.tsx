import { useLayoutEffect, useRef } from 'react';

/** How far a long word may be narrowed before it is clipped; below this it reads as a squeeze. */
const MIN_SCALE = 0.6;

/**
 * A board word on one line, narrowed to its card's width when it is longer (WEDDING on a small phone) instead of
 * breaking mid-word. A transform, so the card never changes size and the type stays on the scale.
 */
export function FitWord({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.closest('li');
    if (!el || !box) return;
    const fit = () => {
      const room = box.clientWidth - 8;
      const need = el.scrollWidth;
      const k = need > room && need > 0 ? Math.max(MIN_SCALE, room / need) : 1;
      el.style.transform = k < 1 ? `scaleX(${k})` : '';
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [children]);
  return (
    <span ref={ref} className="inline-block origin-center whitespace-nowrap">
      {children}
    </span>
  );
}
