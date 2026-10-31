import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

// Sheets can replace each other (Menu → Rules); the element to restore focus to is the first opener, not the old sheet's button.
let opener: HTMLElement | null = null;

const focusables = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );

/**
 * Modal behaviour for a sheet or dialog: moves focus in, traps Tab, closes on Escape and returns focus
 * to whatever opened it. The page behind is made inert by the caller.
 *
 * Native <dialog> was evaluated and rejected: its top layer escapes the phone-width column, its ::backdrop
 * can't take part in the spring enter/exit, and it would need the drag-to-dismiss rebuilt around it.
 */
export function useDialog(ref: RefObject<HTMLElement>, onClose: (() => void) | undefined) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const active = document.activeElement as HTMLElement | null;
    if (!active?.closest('[aria-modal="true"]')) opener = active;
    const mine = opener;

    const first =
      root.querySelector<HTMLElement>('[data-autofocus]') ??
      focusables(root).find((el) => !el.matches('[aria-label="Close"]'));
    (first ?? root).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
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
  }, [ref, onClose]);
}
