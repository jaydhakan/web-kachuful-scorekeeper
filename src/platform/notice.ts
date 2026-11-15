import { useSyncExternalStore } from 'react';

/** One short message from the platform (a theme applied, the app ready offline), with an optional action. */
export interface Notice {
  id: number;
  msg: string;
  action?: { label: string; run: () => void };
  /** How long it stays, in ms; Undo needs 8s (DESIGN-SYSTEM.md, Switching themes). */
  ms: number;
}

let current: Notice | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

/** Shows a notice in the platform's slot, replacing any other. */
export function say(msg: string, o: { action?: Notice['action']; ms?: number } = {}) {
  clearTimeout(timer);
  const n: Notice = { id: ++seq, msg, action: o.action, ms: o.ms ?? (o.action ? 8000 : 4000) };
  current = n;
  emit();
  timer = setTimeout(() => dismiss(n.id), n.ms);
}

/** Clears the notice, or only the one with this id (so a late timer can't clear a newer notice). */
export function dismiss(id?: number) {
  if (!current || (id !== undefined && current.id !== id)) return;
  clearTimeout(timer);
  current = null;
  emit();
}

export const useNotice = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
  );
