import type { Cue } from '@/fx/feedback';
import { stepDown, stepUp } from '@/fx/pitch';
import type { CuePlan, TimedCue } from '@/fx/sequence';

/**
 * Kachuful's cue plans: pure functions of the timings the screens animate with, so a sound can't drift from its
 * motion and the Sound Board can play the same plans. "chime" is a moment in the engine's table; here it is a beat.
 */

/** Between two deltas landing in the score reveal, in ms (the summary's `LAND_GAP`). */
export const LAND_GAP = 60;
/** One rival passed in a comeback, in ms (the summary's `CLIMB_STEP`). */
export const CLIMB_STEP = 170;

const chime: Cue = { name: 'chime', tier: 'beat' };

/** The setup's dealer spin: the ratchet three times, slowing as the token does; the landing's `pop` is the tap's. */
export function spinCues(ms: number): CuePlan {
  return {
    cues: [
      { at: 0, name: 'spin' },
      { at: ms * 0.35, name: 'spin', gain: 0.8 },
      { at: ms * 0.7, name: 'spin', gain: 0.6 },
    ],
  };
}

/** The large screen's roulette: ms between hop `i` and the next of `hops` (it slows down as it nears the dealer). */
export const hopDelay = (i: number, hops: number) => 40 + Math.pow(i / hops, 3) * 260;
/** The roulette's length in ms: the waits between its hops, then the 200ms hold before the dealer is set. */
export const hopsMs = (hops: number) =>
  Array.from({ length: Math.max(0, hops - 1) }, (_, k) => hopDelay(k + 1, hops)).reduce(
    (a, b) => a + b,
    200,
  );

export interface DealTiming {
  /** The last round of the game: dealt slower, with a bell. */
  last: boolean;
  players: number;
  /** The dealer chip passes to a new dealer. */
  needPass: boolean;
  /** When the trump card lifts, and when the closing line shows (`liftAt`, `lineAt`), in ms. */
  liftAt: number;
  lineAt: number;
  /** The line's read in ms, and the stage lengths the deal uses after it. */
  read: number;
  lift: number;
  /** Seconds between two cards leaving the dealer (`gap`). */
  gap: number;
}

/** The deal: the trump turns, the chip passes, a card per player, and the last round's bell. */
export function dealCues(d: DealTiming): CuePlan {
  const passAt = d.lineAt + d.read;
  const dealAt = passAt + (d.needPass ? 800 : 120);
  const cues: TimedCue[] = [{ at: d.liftAt + d.lift, name: 'flick' }];
  if (d.last) cues.push({ at: 120, name: 'bell' });
  if (d.needPass) cues.push({ at: passAt, name: 'pop', tier: 'tick' });
  for (let k = 0; k < d.players; k++)
    cues.push({
      at: dealAt + k * d.gap * 1000,
      name: 'deal',
      tier: 'tick',
      ...(d.last ? { pitch: -3, gain: 0.8 } : {}),
    });
  cues.sort((a, b) => a.at - b.at);
  return { cues, ...(d.last ? { reduced: { name: 'bell' as const } } : {}) };
}

export interface SumFacts {
  /** Each player's result, in bid order (the order the deltas land). */
  results: ('made' | 'missed')[];
  /** Everyone but one missed nothing: the animation lands the made deltas one after another. */
  soleMiss: boolean;
  newLeader: boolean;
  /** Steps in a comeback climb (0 when there is none). */
  climb: number;
}

/** The one sound that stands for a round: a new leader's crown, a sole miss's womp, or all-made's chime. */
export function roundCue(f: Pick<SumFacts, 'results' | 'soleMiss' | 'newLeader'>): Cue | null {
  if (f.newLeader) return { name: 'crown' };
  if (f.soleMiss) return { name: 'womp' };
  return f.results.length > 0 && f.results.every((r) => r === 'made') ? chime : null;
}

/**
 * The score reveal. `at` are the summary's stage start times (the climb's push already in), so the sounds ride the
 * same clock: deltas up a pentatonic scale, then the run's chime or womp, the tally, a `rise` per rival passed, the crown.
 */
export function summaryCues(at: number[], f: SumFacts, push = 0): CuePlan {
  const cues: TimedCue[] = [];
  let up = 0,
    down = 0,
    made = 0;
  // A sole miss lands the miss first, then each made player after the one before; other rounds go in bid order.
  f.results.forEach((r, i) => {
    const t = at[0] + (f.soleMiss ? (r === 'made' ? made++ : 0) : i) * LAND_GAP;
    cues.push(
      r === 'made'
        ? { at: t, name: 'made', pitch: stepUp(up++) }
        : { at: t, name: 'missed', pitch: stepDown(down++) },
    );
  });
  const run = at[0] + f.results.length * LAND_GAP + 80;
  const all = f.results.every((r) => r === 'made');
  if (all && f.results.length) cues.push({ at: run, ...chime });
  else if (f.soleMiss) cues.push({ at: run, name: 'womp' });
  cues.push({ at: at[1], name: 'tally' });
  for (let i = 0; i < f.climb; i++)
    cues.push({ at: at[2] - push + i * CLIMB_STEP, name: 'rise', pitch: stepUp(i) });
  if (f.newLeader) cues.push({ at: at[3], name: 'crown' });
  cues.sort((a, b) => a.at - b.at);
  const one = roundCue(f);
  return { cues, ...(one && { reduced: one, settle: f.newLeader ? one : undefined }) };
}

/** The streak burst: a chime, and for the top step a boom (the one moment-tier sound a streak may make). */
export function streakCues(tier: number, top: number): CuePlan {
  const cues: TimedCue[] = [{ at: 0, ...chime }];
  if (tier >= top) cues.push({ at: 0, name: 'boom' });
  return { cues, reduced: tier >= top ? { name: 'boom' } : chime };
}

/** A round that lands over the live stream: the same one sound the scorer's reveal ends on, or the fanfare. */
export function liveCue(
  prev: { rounds: number; finished: boolean },
  next: { rounds: number; finished: boolean } & Omit<SumFacts, 'climb'>,
): Cue | null {
  if (next.finished && !prev.finished) return { name: 'fanfare' };
  return next.rounds > prev.rounds ? roundCue(next) : null;
}
