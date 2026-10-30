import { useEffect, type RefObject } from 'react';

const typing = () => {
  const a = document.activeElement;
  return a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement;
};

/**
 * iOS Safari ignores interactive-widget and lets the keyboard cover the page instead of resizing it. While a
 * field has focus, this sizes `ref` to the visible part of the screen; it writes only when the size changes.
 */
export function useVisualViewport(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;
    let last = '';
    const apply = () => {
      // A small difference is browser chrome, not a keyboard.
      const keyboard = typing() && window.innerHeight - vv.height > 80;
      const next = keyboard ? `${Math.round(vv.height)}px` : '';
      if (next === last) return;
      last = next;
      if (next) el.style.height = next;
      else el.style.removeProperty('height');
    };
    // Focus leaves before the keyboard finishes closing, so blur is checked on the next turn.
    const afterBlur = () => setTimeout(apply, 0);
    vv.addEventListener('resize', apply);
    document.addEventListener('focusin', apply);
    document.addEventListener('focusout', afterBlur);
    return () => {
      vv.removeEventListener('resize', apply);
      document.removeEventListener('focusin', apply);
      document.removeEventListener('focusout', afterBlur);
      el.style.removeProperty('height');
    };
  }, [ref]);
}
