import { useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';

interface Options {
  /** Index of the selected option, or -1 / undefined when none is. */
  selected?: number;
  /** `grid` also moves with ArrowUp/Down, by this many options. */
  columns?: number;
  orientation?: 'horizontal' | 'vertical' | 'grid';
}

const ITEM = '[data-roving]';

/**
 * Roving tab stop for a group of option buttons: one Tab stop (the selected option, else the first) and
 * arrow keys that only move focus. Enter and Space stay with the native button. Items are read from the
 * DOM, so the group's length can change between renders.
 */
export function useRovingFocus({
  selected = -1,
  columns = 1,
  orientation = 'horizontal',
}: Options) {
  const ref = useRef<HTMLDivElement>(null);
  // Follows focus while it is inside the group, so Tab from any option leaves the group instead of jumping to the selection.
  const [cursor, setCursor] = useState<number | null>(null);
  const stop = cursor ?? Math.max(selected, 0);

  const items = () => [...(ref.current?.querySelectorAll<HTMLElement>(ITEM) ?? [])];
  const indexOf = (el: EventTarget) =>
    items().indexOf((el as HTMLElement).closest<HTMLElement>(ITEM) as HTMLElement);

  const step = (key: string): number | null => {
    const vertical = orientation === 'vertical';
    if (key === (vertical ? 'ArrowDown' : 'ArrowRight')) return 1;
    if (key === (vertical ? 'ArrowUp' : 'ArrowLeft')) return -1;
    if (orientation === 'grid') {
      if (key === 'ArrowDown') return columns;
      if (key === 'ArrowUp') return -columns;
    }
    return null;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const list = items();
    const from = indexOf(e.target);
    const d = step(e.key);
    if (from < 0 || d === null) return;
    const n = list.length;
    let to = from + d;
    if (Math.abs(d) === 1) to = (to + n) % n;
    // Vertical wrap in a grid keeps the column: past the last row goes to the top, above the first to the bottom.
    else if (to >= n) to = from % columns;
    else if (to < 0) to = from + Math.floor((n - 1 - from) / columns) * columns;
    e.preventDefault();
    list[to].focus();
  };

  const onFocus = (e: FocusEvent<HTMLElement>) => {
    const i = indexOf(e.target);
    if (i >= 0) setCursor(i);
  };

  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCursor(null);
  };

  return {
    group: { ref, onKeyDown, onFocus, onBlur },
    item: (i: number) => ({ tabIndex: i === stop ? 0 : -1, 'data-roving': '' }),
  };
}
