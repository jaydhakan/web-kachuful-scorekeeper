import { LAND_AFTER_MS, LAND_MS, type RevealPlan } from '@/components/ui/podiumReveal';
import type { CuePlan, TimedCue } from './sequence';

/** The drum roll's hit is 580ms in (`roll` in sound.ts); it starts that long before the winner lands. */
const ROLL_LEAD_MS = 580;
/** The fanfare's reed enters 750ms in (`fanfare` in sound.ts). */
const PATAKHA_AFTER_MS = 750;

/**
 * The podium's sounds from the reveal's own timings: 3rd and 2nd land with a thud, the winner's step builds on a
 * drum roll and lands on the fanfare (with a cracker for the last game of the night, `ceremony`). A leaderboard's
 * smaller podium crowns with a bell instead of the fanfare.
 */
export function podiumCues(plan: RevealPlan, { board = false, ceremony = false } = {}): CuePlan {
  const land = (at: number) => at + LAND_AFTER_MS + LAND_MS;
  const cues: TimedCue[] = [];
  const { step } = plan;
  if (step[3] !== null) cues.push({ at: land(step[3]), name: 'thud', gain: 0.6 });
  if (step[2] !== null) cues.push({ at: land(step[2]), name: 'thud', gain: 0.8 });
  if (step[1] !== null) {
    const at = land(step[1]);
    if (board) cues.push({ at, name: 'crown' });
    else cues.push({ at: Math.max(0, at - ROLL_LEAD_MS), name: 'roll' }, { at, name: 'fanfare' });
    // The last game of the night: a cracker goes off as the fanfare's reed comes in.
    if (ceremony && !board) cues.push({ at: at + PATAKHA_AFTER_MS, name: 'patakha' });
  }
  const last = board ? { name: 'crown' as const } : { name: 'fanfare' as const };
  return { cues, reduced: last, settle: last };
}
