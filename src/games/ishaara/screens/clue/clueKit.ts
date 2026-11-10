import { useEffect, useState } from 'react';
import { reasonOf } from '@/games/ishaara/sync/endpoints';
import type { SendResult } from '@/games/ishaara/state/link';
import { clue } from '@/games/ishaara/strings/clue';

export const CTA =
  'press flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-key-cta px-5 text-18 font-bold text-key-cta-ink disabled:cursor-default disabled:opacity-50';
export const OUTLINE =
  'press flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-key-surface px-5 text-16 font-semibold text-key-text shadow-[inset_0_0_0_1.5px_var(--key-edge)] disabled:cursor-default disabled:opacity-50';
export const PANEL = 'rounded-[22px] bg-key-surface p-4 shadow-[inset_0_0_0_1px_var(--key-edge)]';
export const LABEL = 'text-13 font-bold uppercase tracking-[0.12em] text-key-text-2';

/** Seconds left until `deadline` on the server's clock (`offset` = server − device), or null with no timer. */
export function useCountdown(deadline: number | null, offset: number): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [deadline]);
  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline - offset - now) / 1000));
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** A failed send as a plain sentence; a send refused for being busy says nothing (the first one is still going). */
export function sendError(r: SendResult): string | null {
  if (r.ok) return null;
  if ('refused' in r) return r.refused === 'offline' ? clue.errors.offline : null;
  const e = r.error;
  if (e.offline) return clue.errors.offline;
  if (e.status === 409) return clue.errors.stale;
  if (e.code === 'not_your_turn') return clue.errors.notYourTurn;
  const reason = reasonOf(e);
  return (reason && clue.errors.reasons[reason]) || clue.errors.generic;
}
