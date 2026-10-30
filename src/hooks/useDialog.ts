import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

// Sheets can replace each other (Menu → Rules); the element to restore focus to is the first opener, not the old sheet's button.
let opener: HTMLElement | null = null;

// The page behind a dialog goes inert as the dialog mounts, which blurs the trigger before any effect can read it;
// so the trigger is remembered as it is used (pointerdown too: Safari does not focus a button on click).
let trigger: HTMLElement | null = null;
const remember = (e: Event) => {
  const el = (e.target as Element | null)?.closest<HTMLElement>(
    'button,a[href],input,select,textarea,[tabindex],[role="button"]',
  );
  if (el && !el.closest('[aria-modal="true"]')) trigger = el;
};
document.addEventListener('focusin', remember, true);
document.addEventListener('pointerdown', remember, true);

const focusables = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.closest('[hidden],[inert]') && getComputedStyle(el).visibility !== 'hidden',
  );

/**
 * Modal behaviour for a sheet or dialog: moves focus in, traps Tab, closes on Escape and returns focus
 * to whatever opened it. The page behind is made inert by the caller.
 *
 * Native <dialog> was evaluated and rejected: its top layer escapes the phone-width column, its ::backdrop
 * can't take part in the spring enter/exit, and it would need the drag-to-dismiss rebuilt around it.
 */
export function useDialog(ref: RefObject<HTMLElement>, onClose: (() => void) | undefined) {
  // Read at key time so the effect below runs once per dialog: re-running it on every new closure would
  // re-take the opener after a click moved focus out, and pull focus back to the first control.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const active = document.activeElement as HTMLElement | null;
    if (!active?.closest('[aria-modal="true"]')) opener = trigger?.isConnected ? trigger : active;
    const mine = opener;

    const first =
      root.querySelector<HTMLElement>('[data-autofocus]') ??
      focusables(root).find((el) => !el.matches('[data-skip-initial-focus],[role="region"]'));
    (first ?? root).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && close.current) {
        e.preventDefault();
        e.stopPropagation();
        close.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables(root);
      if (!items.length) {
        e.preventDefault();
        root.focus();
        return;
      }
      const a = document.activeElement;
      if (e.shiftKey && (a === items[0] || !root.contains(a))) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && (a === items[items.length - 1] || !root.contains(a))) {
        e.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (!document.querySelector('[aria-modal="true"]:not([data-closing])') && mine?.isConnected)
        mine.focus({ preventScroll: true });
    };
  }, [ref]);
}
