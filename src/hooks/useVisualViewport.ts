import { useEffect, type RefObject } from 'react';

const typing = () => {
  const a = document.activeElement;
  return a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement;
};

/**
 * Marks `ref` (a positioned element) with `data-kb` while the on-screen keyboard is up, so layouts can use the `kb:`
 * variant. iOS Safari ignores interactive-widget and lets the keyboard cover the page instead of resizing it, so
 * there it also fits `ref` to the visible part of the screen. It writes only when that changes.
 */
export function useVisualViewport(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const vv = window.visualViewport;
    const el = ref.current;
    if (!vv || !el) return;
    let last = '';
    // Android resizes the page with the keyboard, so the tallest height seen in this orientation is the baseline.
    let full = window.innerHeight,
      width = window.innerWidth;
    const apply = () => {
      if (window.innerWidth !== width) {
        width = window.innerWidth;
        full = 0;
      }
      if (!typing()) full = Math.max(full, window.innerHeight);
      // A small difference is browser chrome, not a keyboard.
      const keyboard = typing() && Math.max(full, window.innerHeight) - vv.height > 120;
      const covered = keyboard && window.innerHeight - vv.height > 80;
      // The browser also scrolls the page to show the field; without following it, the app sits above the
      // visible area and the bare page shows below it as a black band.
      const next = `${keyboard} ${covered ? `${Math.round(vv.height)} ${Math.round(vv.pageTop)}` : ''}`;
      if (next === last) return;
      last = next;
      el.toggleAttribute('data-kb', keyboard);
      if (covered) {
        el.style.height = `${Math.round(vv.height)}px`;
        el.style.top = `${Math.round(vv.pageTop)}px`;
      } else {
        el.style.removeProperty('height');
        el.style.removeProperty('top');
        // iOS can leave the page scrolled once the keyboard has gone, which would leave the same band.
        if (!keyboard && window.scrollY) window.scrollTo(0, 0);
      }
    };
    // Focus leaves before the keyboard finishes closing, so blur is checked on the next turn.
    const afterBlur = () => setTimeout(apply, 0);
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    document.addEventListener('focusin', apply);
    document.addEventListener('focusout', afterBlur);
    return () => {
      vv.removeEventListener('resize', apply);
      vv.removeEventListener('scroll', apply);
      document.removeEventListener('focusin', apply);
      document.removeEventListener('focusout', afterBlur);
      el.removeAttribute('data-kb');
      el.style.removeProperty('height');
      el.style.removeProperty('top');
    };
  }, [ref]);
}
