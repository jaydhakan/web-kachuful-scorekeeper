import { useCallback, useEffect, useState } from 'react';

/**
 * An element's live content height, through a callback ref: `const [ref, h] = useBoxHeight()`. 0 until measured, and
 * where ResizeObserver is missing.
 */
export function useBoxHeight<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [el, setEl] = useState<T | null>(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setH(Math.round(e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [useCallback((e: T | null) => setEl(e), []), h];
}
