import { useIsPresent } from 'framer-motion';
import { useRef } from 'react';
import { useKt } from '@/games/kaali-teeri/state/store';
import { useShortcuts, type Shortcuts } from '@/hooks/useShortcuts';

/**
 * A screen's shortcuts, off while anything covers it (a sheet, a confirmation, the deal, the repair prompt) and while
 * it animates out. Open dialogs are already skipped by useShortcuts.
 */
export function useKtDeskKeys(map: Shortcuts) {
  const { state } = useKt();
  const covered = !!state.sheet || !!state.modal || !!state.deal || state.corrupt;
  const present = useIsPresent();
  useShortcuts(map, !covered && present);
}

/** Typed digits this close together build one number: 1, 8, 5 make 185. */
const TYPED_MS = 1200;

/** Turns digit presses into a number, three digits at most; a pause starts a new one. */
export function useTypedNumber() {
  const r = useRef({ s: '', at: 0 });
  return (digit: string): number => {
    const now = performance.now();
    const s = ((now - r.current.at < TYPED_MS ? r.current.s : '') + digit).slice(-3);
    r.current = { s, at: now };
    return Number(s);
  };
}

/** Whether `v` is one of the range's values (min, min + step, … max). */
export const onGrid = (v: number, min: number, max: number, step: number) =>
  v >= min && v <= max && (v - min) % step === 0;
