import { vibrate, type Haptic } from '@/hooks/useHaptics';
import type { CueOpts, SoundName, SoundTier } from './sound';

/** One sound to play: its name, a tier that overrides the sound's own, and a pitch or gain. */
export interface Cue extends CueOpts {
  name: SoundName;
  tier?: SoundTier;
}

/** The haptic patterns (Android only; iPhone has no vibration API). Each says what happened, not just "something". */
export const HAPTIC = {
  TAP: 10,
  NOPE: [8, 30, 8],
  BEAT: [12, 40, 18],
  BIG: [20, 40, 20],
  WIN: [12, 40, 18, 40, 30],
} as const satisfies Record<string, Haptic>;

/** The synth loads with the first sound, not with the screens that can ask for one (a game never imports `sound`). */
let synth: Promise<typeof import('./sound')> | null = null;
export function playCue({ name, tier, ...o }: Cue) {
  void (synth ??= import('./sound')).then((m) => m.cue(name, tier, o));
}

interface Feel {
  sound: Cue;
  haptic: Haptic;
  /** A second sound that rides on the first (the top bid's shimmer). */
  also?: Cue;
}

/** What a tap feels and sounds like, so a store asks for the kind and the sound and buzz always travel together. */
export const FEEL = {
  tap: { sound: { name: 'pop' }, haptic: HAPTIC.TAP },
  bid: { sound: { name: 'flick' }, haptic: HAPTIC.TAP },
  forbidden: { sound: { name: 'knock' }, haptic: HAPTIC.NOPE },
  pass: { sound: { name: 'knock' }, haptic: HAPTIC.TAP },
  raise: { sound: { name: 'chip' }, haptic: HAPTIC.TAP },
  raiseTop: { sound: { name: 'chip' }, haptic: HAPTIC.BEAT, also: { name: 'crown' } },
  undo: { sound: { name: 'undo' }, haptic: HAPTIC.TAP },
  err: { sound: { name: 'err' }, haptic: HAPTIC.NOPE },
  confirm: { sound: { name: 'thud', gain: 0.6 }, haptic: HAPTIC.TAP },
  begin: { sound: { name: 'riffle' }, haptic: HAPTIC.BEAT },
  startPlay: { sound: { name: 'riffle', tier: 'tick', gain: 0.6 }, haptic: HAPTIC.TAP },
  hook: { sound: { name: 'hook' }, haptic: HAPTIC.BIG },
  pick: { sound: { name: 'flick' }, haptic: HAPTIC.TAP },
} as const satisfies Record<string, Feel>;
export type FeedbackKind = keyof typeof FEEL;

/** Buzzes and plays the sound for one kind of tap; `o` (a pitch, a gain) shapes the sound only. */
export function feedback(kind: FeedbackKind, o: CueOpts = {}) {
  const f: Feel = FEEL[kind];
  vibrate(f.haptic);
  playCue({ ...f.sound, ...o });
  if (f.also) playCue(f.also);
}
