/** Pitch maths for the sound cues, kept tiny and synth-free so a game's cue plan can use it without the sounds. */

/** A frequency multiplier for a semitone offset. */
export const semis = (n: number) => 2 ** (n / 12);

const PENTATONIC = [0, 2, 4, 7, 9];

/** Semitones of the i-th note up a major pentatonic scale (do, re, mi, sol, la, then the octave): a run never clashes. */
export const stepUp = (i: number) => PENTATONIC[i % 5] + 12 * Math.floor(i / 5);

/** The same scale going down from the root: the first is the root, each next one lower. */
export const stepDown = (i: number) => -stepUp(i);

/** Semitones for a bid between the lowest and highest the auction allows: low bids sit low, the top bid sits high. */
export const bidPitch = (amount: number, lo: number, hi: number, span = 9) =>
  hi <= lo ? 0 : Math.round(((Math.min(hi, Math.max(lo, amount)) - lo) / (hi - lo)) * span);
