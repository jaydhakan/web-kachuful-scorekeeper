/**
 * Every game's sounds, synthesised with Web Audio (no files, so nothing to license or download). The mix is quiet,
 * nothing plays until the first tap unlocks audio or while the page is hidden. `sfx` follows Spades' own `mode`
 * (everyone's sounds, only those about them, or none; Spades plan D13).
 */
import { readFx, type SoundLevel } from './prefs';

export type SoundMode = 'all' | 'mine' | 'off';
export type SoundName =
  | 'riffle'
  | 'deal'
  | 'snap'
  | 'sweep'
  | 'bag'
  | 'burst'
  | 'crack'
  | 'cheer'
  | 'tick'
  | 'pop'
  | 'thud'
  | 'err'
  | 'chime'
  | 'womp'
  | 'gavel'
  | 'roll'
  | 'glitch'
  | 'boom'
  | 'heartbeat';

/** Which kind of event a sound belongs to (WOW-MOMENTS-PLAN §2.1); the platform's "Big moments" plays only `moment`. */
export type SoundTier = 'moment' | 'beat' | 'tick';
export const SOUND_TIER: Record<SoundName, SoundTier> = {
  riffle: 'beat',
  deal: 'tick',
  snap: 'tick',
  sweep: 'tick',
  bag: 'tick',
  burst: 'beat',
  crack: 'beat',
  cheer: 'moment',
  tick: 'tick',
  pop: 'tick',
  thud: 'beat',
  err: 'tick',
  chime: 'moment',
  womp: 'beat',
  gavel: 'beat',
  roll: 'beat',
  glitch: 'moment',
  boom: 'moment',
  heartbeat: 'beat',
};

const MASTER = 0.55;

let mode: SoundMode = 'all';
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let unlocked = false;
let armed = false;

export const setSoundMode = (m: SoundMode) => {
  mode = m;
};
export const soundMode = () => mode;

type AudioCtor = typeof AudioContext;
function audio(): AudioContext | null {
  if (!unlocked) return null;
  if (!ctx) {
    const C =
      (globalThis as { AudioContext?: AudioCtor }).AudioContext ??
      (globalThis as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
      out = ctx.createGain();
      out.gain.value = MASTER;
      out.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
}

/** Browsers start audio only from a gesture: the first tap anywhere on the page unlocks it. */
export function armAudio() {
  if (armed || typeof window === 'undefined') return;
  armed = true;
  const go = () => {
    unlocked = true;
    audio();
  };
  window.addEventListener('pointerdown', go, { once: true, capture: true });
  window.addEventListener('keydown', go, { once: true, capture: true });
}

interface Noise {
  freq?: number;
  q?: number;
  type?: BiquadFilterType;
  vol?: number;
  attack?: number;
  delay?: number;
}
function noise(a: AudioContext, dur: number, o: Noise = {}) {
  const { freq = 3000, q = 1, type = 'bandpass', vol = 0.12, attack = 0.002, delay = 0 } = o;
  const n = Math.max(1, Math.floor(a.sampleRate * dur));
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  const t = a.currentTime + delay;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src
    .connect(f)
    .connect(g)
    .connect(out as GainNode);
  src.start(t);
  src.stop(t + dur + 0.05);
}

function tone(
  a: AudioContext,
  freq: number,
  dur: number,
  o: { type?: OscillatorType; vol?: number; delay?: number; to?: number } = {},
) {
  const { type = 'sine', vol = 0.06, delay = 0, to } = o;
  const osc = a.createOscillator();
  const g = a.createGain();
  const t = a.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out as GainNode);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const SYNTH: Record<SoundName, (a: AudioContext) => void> = {
  snap: (a) => noise(a, 0.06, { freq: 2600, q: 0.7, vol: 0.2 }),
  deal: (a) => noise(a, 0.035, { freq: 3400, vol: 0.05 }),
  riffle: (a) => {
    for (let i = 0; i < 16; i++)
      noise(a, 0.03, { freq: 3000 + Math.random() * 2000, q: 1.4, vol: 0.07, delay: i * 0.03 });
  },
  sweep: (a) => noise(a, 0.3, { freq: 1400, q: 0.4, type: 'lowpass', vol: 0.1, attack: 0.08 }),
  bag: (a) => {
    tone(a, 170, 0.16, { type: 'triangle', vol: 0.1 });
    noise(a, 0.08, { freq: 500, type: 'lowpass', vol: 0.08 });
  },
  burst: (a) => {
    noise(a, 0.4, { freq: 700, q: 0.3, vol: 0.18 });
    tone(a, 110, 0.45, { type: 'triangle', vol: 0.09 });
  },
  crack: (a) => {
    noise(a, 0.3, { freq: 900, q: 0.4, vol: 0.16 });
    tone(a, 80, 0.35, { type: 'sawtooth', vol: 0.035 });
  },
  cheer: (a) =>
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(a, f, 0.4, { type: 'triangle', vol: 0.05, delay: i * 0.09 }),
    ),
  tick: (a) => {
    tone(a, 880, 0.08, { vol: 0.05 });
    tone(a, 1320, 0.1, { vol: 0.035, delay: 0.07 });
  },
  pop: (a) => tone(a, 620, 0.07, { vol: 0.045 }),
  thud: (a) => {
    tone(a, 95, 0.25, { vol: 0.12 });
    noise(a, 0.1, { freq: 300, type: 'lowpass', vol: 0.1 });
  },
  err: (a) => tone(a, 150, 0.12, { type: 'square', vol: 0.03 }),
  // The moments' sounds (motion-preview.html), each under 0.8s.
  chime: (a) => {
    tone(a, 880, 0.3, { vol: 0.09 });
    tone(a, 1318, 0.45, { vol: 0.08, delay: 0.12 });
  },
  womp: (a) => {
    tone(a, 330, 0.28, { type: 'sawtooth', vol: 0.03, to: 250 });
    tone(a, 250, 0.5, { type: 'sawtooth', vol: 0.035, to: 110, delay: 0.28 });
  },
  gavel: (a) => {
    noise(a, 0.05, { freq: 2400, q: 4, vol: 0.25 });
    noise(a, 0.06, { freq: 2000, q: 4, vol: 0.3, delay: 0.14 });
  },
  roll: (a) => {
    for (let i = 0; i < 12; i++)
      noise(a, 0.04, { freq: 1600, vol: 0.025 + i * 0.006, delay: i * 0.045 });
    noise(a, 0.14, { freq: 700, vol: 0.2, delay: 0.58 });
    tone(a, 98, 0.22, { vol: 0.15, to: 60, delay: 0.58 });
  },
  glitch: (a) => {
    for (let i = 0; i < 7; i++)
      noise(a, 0.03, { freq: 400 + Math.random() * 3600, q: 5, vol: 0.11, delay: i * 0.04 });
  },
  boom: (a) => {
    tone(a, 130, 0.7, { vol: 0.22, to: 38 });
    noise(a, 0.35, { freq: 300, q: 0.8, vol: 0.09 });
    tone(a, 660, 0.4, { type: 'triangle', vol: 0.04, delay: 0.1 });
  },
  heartbeat: (a) => {
    tone(a, 64, 0.16, { vol: 0.25, to: 48 });
    tone(a, 58, 0.2, { vol: 0.2, to: 44, delay: 0.22 });
  },
};

/** Whether a sound plays under the current mode; `mine` marks a sound about this phone's player. */
export const audible = (m: SoundMode, mine: boolean) => m === 'all' || (m === 'mine' && mine);

function play(name: SoundName) {
  if (typeof document !== 'undefined' && document.hidden) return;
  const a = audio();
  if (!a) return;
  try {
    SYNTH[name](a);
  } catch {
    /* a closed or interrupted context: stay quiet */
  }
}

/** Plays one sound if Spades' mode allows it, audio is unlocked and the page is visible. Never throws. */
export function sfx(name: SoundName, mine = false) {
  if (audible(mode, mine)) play(name);
}

/** Whether the platform setting lets a sound of this tier play: "Big moments" keeps only the moments. */
export const tierAudible = (level: SoundLevel, tier: SoundTier) =>
  level === 'all' || (level === 'moments' && tier === 'moment');

/**
 * Plays a sound under the platform's Sounds setting (every game but Spades, whose own mode wins there). `tier`
 * overrides the sound's own, for a sound used at a smaller moment (a small unlock's chime is a beat).
 */
export function cue(name: SoundName, tier: SoundTier = SOUND_TIER[name]) {
  armAudio();
  if (tierAudible(readFx().sounds, tier)) play(name);
}
