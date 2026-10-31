import { useEffect, useRef } from 'react';

/** A shortcut name: a lower-case letter, `digit` (0–9, the handler reads `e.key`), `enter`, `?` or `undo` (⌘/Ctrl+Z). */
export type ShortcutKey = string;
export type Shortcuts = Partial<Record<ShortcutKey, (e: KeyboardEvent) => void>>;

/** Controls that act on Enter themselves; Enter on one of them must not also fire the page's shortcut. */
const ACTIVATES = 'button,a[href],[role="button"],[role="switch"],[role="link"],summary';
const TYPING = 'input,textarea,select,[contenteditable=""],[contenteditable="true"]';

/** The shortcut a key press stands for, or null when it is not one. */
export function shortcutOf(e: KeyboardEvent): ShortcutKey | null {
  if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'z' && !e.shiftKey)
    return 'undo';
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.key === '?') return '?';
  if (/^[0-9]$/.test(e.key)) return 'digit';
  if (e.key === 'Enter') return 'enter';
  return /^[a-zA-Z]$/.test(e.key) ? e.key.toLowerCase() : null;
}

/**
 * Page-level keyboard shortcuts. Keys typed into a field, keys held down (except digits), and every key while a
 * dialog is open are left alone; a dialog handles its own Escape and Tab.
 */
export function useShortcuts(map: Shortcuts, enabled = true) {
  const ref = useRef(map);
  useEffect(() => {
    ref.current = map;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(TYPING)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      let k = shortcutOf(e);
      if (!k) return;
      if (k === 'undo') k = ref.current.undo ? 'undo' : 'z';
      // Enter on an option that is already picked would do nothing, so it confirms instead.
      if (k === 'enter' && target?.closest(ACTIVATES) && !target.closest('[aria-pressed="true"]'))
        return;
      if (e.repeat && k !== 'digit') return;
      const f = ref.current[k];
      if (!f) return;
      e.preventDefault();
      f(e);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled]);
}
