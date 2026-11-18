import { playCue, type Cue } from '@/fx/feedback';
import { scheduleCues, type CuePlan, type CueRun } from '@/fx/sequence';

/** Reveals already heard this session, by the state that produced them (a round's confirm time, a game's finish). */
const heard = new Set<string>();

/**
 * Schedules a plan once per `key`: a remount, a layout swap or a re-render of the same state stays silent, while a
 * StrictMode effect re-run (cancelled before any cue played) still plays. Returns null when already heard.
 */
export function playOnce(
  key: string,
  plan: CuePlan,
  { reduced, play = playCue }: { reduced: boolean; play?: (c: Cue) => void },
): CueRun | null {
  if (heard.has(key)) return null;
  return scheduleCues(plan, {
    reduced,
    play: (c) => {
      heard.add(key);
      play(c);
    },
  });
}

/** Test seam: forget what was heard. */
export const forgetHeard = () => heard.clear();
