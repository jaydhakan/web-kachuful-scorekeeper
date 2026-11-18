import { useEffect, useMemo, useRef } from 'react';
import { playCue } from '@/fx/feedback';
import { scheduleCues, type CuePlan, type CueRun } from '@/fx/sequence';

// What already sounded this page-life, by key: a remount, a reload of the same screen or a re-render never replays it.
const played = new Set<string>();
const MAX = 200;

/**
 * Plays a plan's cues once for `key` (a game, hand or state it belongs to; null plays nothing). The sequence is
 * cancelled on unmount; a StrictMode re-run before anything sounded plays it afresh. `cancel` is for a tap-to-skip.
 */
export function useCuePlan(
  key: string | null,
  plan: CuePlan | null,
  { reduced = false }: { reduced?: boolean } = {},
): Pick<CueRun, 'cancel'> {
  const run = useRef<CueRun | null>(null);
  const latest = useRef(plan);
  latest.current = plan;
  useEffect(() => {
    const p = latest.current;
    if (!key || !p || played.has(key)) return;
    played.add(key);
    if (played.size > MAX) played.delete(played.values().next().value as string);
    let fired = false;
    const r = scheduleCues(p, {
      reduced,
      play: (c) => {
        fired = true;
        playCue(c);
      },
    });
    run.current = r;
    return () => {
      r.cancel();
      run.current = null;
      if (!fired) played.delete(key);
    };
  }, [key, reduced]);
  return useMemo(() => ({ cancel: (o) => run.current?.cancel(o) }), []);
}

/** Forgets what played (tests). */
export const forgetCuePlans = () => played.clear();
