/**
 * Every game's sounds, synthesised with Web Audio (no files, so nothing to license or download). The mix is quiet,
 * nothing plays until the first tap unlocks audio or while the page is hidden. `sfx` follows Spades' own `mode`
 * (everyone's sounds, only those about them, or none; Spades plan D13).
 */
import { readFx, type SoundLevel } from './prefs';
import { semis } from './pitch';

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
  | 'heartbeat'
  | 'flick'
  | 'chip'
  | 'knock'
  | 'hook'
  | 'made'
  | 'missed'
  | 'tally'
  | 'rise'
  | 'crown'
  | 'bell'
  | 'spin'
  | 'undo'
  | 'fanfare';

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
  gavel: 'moment',
  roll: 'beat',
  glitch: 'moment',
  boom: 'moment',
  heartbeat: 'beat',
  flick: 'tick',
  chip: 'tick',
  knock: 'tick',
  hook: 'beat',
  made: 'beat',
  missed: 'beat',
  tally: 'beat',
  rise: 'beat',
  crown: 'beat',
  bell: 'moment',
  spin: 'tick',
  undo: 'tick',
  fanfare: 'moment',
};

/** How one play is shaped: `rate` multiplies every frequency (a pitch), `gain` every volume. */
export interface CueOpts {
  /** Semitones up or down from the recipe's own pitch. */
  pitch?: number;
  gain?: number;
}

const MASTER = 0.55;

let mode: SoundMode = 'all';
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let normal: GainNode | null = null;
let loud: GainNode | null = null;
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
      // Two buses so a moment can duck everything else without ducking itself.
      normal = ctx.createGain();
      normal.connect(out);
      loud = ctx.createGain();
      loud.connect(out);
      white = null;
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

// The play being built: its pitch and loudness, the bus it goes to, and when its last source ends.
const cur = { rate: 1, gain: 1, end: 0, bus: null as GainNode | null };
const stamp = (delay: number, dur: number) => (cur.end = Math.max(cur.end, delay + dur));

// One second of white noise per context; every burst plays a random slice of it instead of filling a new buffer.
let white: AudioBuffer | null = null;
function whiteNoise(a: AudioContext) {
  if (white) return white;
  const n = Math.max(1, Math.floor(a.sampleRate));
  white = a.createBuffer(1, n, a.sampleRate);
  const d = white.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return white;
}

function noise(a: AudioContext, dur: number, o: Noise = {}) {
  const { freq = 3000, q = 1, type = 'bandpass', vol = 0.12, attack = 0.002, delay = 0 } = o;
  const len = Math.min(dur + 0.05, 1);
  const src = a.createBufferSource();
  src.buffer = whiteNoise(a);
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq * cur.rate;
  f.Q.value = q;
  const g = a.createGain();
  const t = a.currentTime + delay;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol * cur.gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src
    .connect(f)
    .connect(g)
    .connect(cur.bus as GainNode);
  src.start(t, Math.random() * (1 - len), len);
  src.stop(t + dur + 0.05);
  stamp(delay, dur);
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
  osc.frequency.setValueAtTime(freq * cur.rate, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to * cur.rate, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol * cur.gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(cur.bus as GainNode);
  osc.start(t);
  osc.stop(t + dur + 0.05);
  stamp(delay, dur);
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
  // The table sounds (SOUND-PLAN §3): cards, wood, chips, a brass bell and a dhol.
  flick: (a) => {
    noise(a, 0.05, { freq: 4200, q: 1.2, vol: 0.05 });
    tone(a, 1800, 0.04, { vol: 0.018, to: 900 });
  },
  chip: (a) => {
    tone(a, 520, 0.09, { type: 'triangle', vol: 0.05, to: 430 });
    noise(a, 0.03, { freq: 1800, q: 2, vol: 0.04 });
  },
  knock: (a) => {
    tone(a, 180, 0.07, { vol: 0.06, to: 120 });
    tone(a, 170, 0.07, { vol: 0.055, to: 115, delay: 0.11 });
    noise(a, 0.04, { freq: 400, type: 'lowpass', vol: 0.04 });
  },
  hook: (a) => {
    tone(a, 1400, 0.14, { type: 'sawtooth', vol: 0.03, to: 300 });
    tone(a, 110, 0.3, { type: 'triangle', vol: 0.12, to: 85, delay: 0.15 });
    noise(a, 0.04, { freq: 800, q: 1.5, vol: 0.08, delay: 0.15 });
  },
  made: (a) => {
    tone(a, 660, 0.18, { type: 'triangle', vol: 0.09 });
    tone(a, 990, 0.3, { type: 'triangle', vol: 0.08, delay: 0.08 });
  },
  missed: (a) => {
    tone(a, 260, 0.25, { type: 'triangle', vol: 0.1, to: 170 });
    noise(a, 0.06, { freq: 300, type: 'lowpass', vol: 0.06 });
  },
  tally: (a) => {
    for (let i = 0; i < 8; i++)
      noise(a, 0.035, { freq: 5200, q: 3, vol: 0.035 + (i % 2) * 0.01, delay: i * 0.045 });
  },
  rise: (a) => {
    noise(a, 0.3, { freq: 900, q: 0.6, vol: 0.06, attack: 0.15 });
    tone(a, 400, 0.28, { vol: 0.035, to: 1200 });
  },
  crown: (a) => {
    tone(a, 1568, 0.5, { vol: 0.07 });
    tone(a, 2349, 0.6, { vol: 0.04, delay: 0.02 });
    tone(a, 3136, 0.4, { vol: 0.02, delay: 0.04 });
  },
  bell: (a) => {
    noise(a, 0.03, { freq: 1200, q: 1, vol: 0.1 });
    tone(a, 196, 0.75, { vol: 0.2 });
    tone(a, 470, 0.6, { vol: 0.09 });
    tone(a, 1166, 0.4, { vol: 0.04 });
  },
  spin: (a) => {
    let t = 0;
    for (let i = 0; i < 8; i++) {
      noise(a, 0.015, { freq: 2500, q: 2, vol: 0.04, delay: t });
      t += 0.03 + i * 0.012;
    }
  },
  undo: (a) => {
    noise(a, 0.12, { freq: 2500, q: 0.8, vol: 0.05, attack: 0.08 });
    tone(a, 900, 0.1, { vol: 0.02, to: 400 });
  },
  // A dhol phrase (dha, dhin, dhin, dha) on low toms, then a rising triad on a reed.
  fanfare: (a) => {
    [
      [110, 0, 0.2],
      [150, 0.18, 0.14],
      [150, 0.36, 0.14],
      [100, 0.54, 0.25],
    ].forEach(([f, d, v]) => {
      tone(a, f, 0.18, { vol: v, to: f * 0.62, delay: d });
      noise(a, 0.05, { freq: 500, type: 'lowpass', vol: v * 0.6, delay: d });
    });
    [523, 659, 784].forEach((f, i) =>
      tone(a, f, 0.65, { type: 'sawtooth', vol: 0.05, delay: 0.75 + i * 0.07 }),
    );
  },
};

/** Whether a sound plays under the current mode; `mine` marks a sound about this phone's player. */
export const audible = (m: SoundMode, mine: boolean) => m === 'all' || (m === 'mine' && mine);

// The limiter: a sound at most once per 60ms, at most four at once; a moment ducks the rest while it rings.
const REPEAT_MS = 60;
const MAX_VOICES = 4;
const DUCK = 0.5;
const lastAt = new Map<SoundName, number>();
let voices: number[] = [];
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
/** Tests start each case with a clear limiter. */
export const resetLimiterForTests = () => {
  lastAt.clear();
  voices = [];
};

function play(name: SoundName, o: CueOpts = {}) {
  if (typeof document !== 'undefined' && document.hidden) return;
  const now = clock();
  const moment = SOUND_TIER[name] === 'moment';
  if (now - (lastAt.get(name) ?? -Infinity) < REPEAT_MS) return;
  voices = voices.filter((e) => e > now);
  if (voices.length >= MAX_VOICES && !moment) return;
  const a = audio();
  if (!a || !normal || !loud) return;
  cur.rate = o.pitch ? semis(o.pitch) : 1;
  cur.gain = o.gain ?? 1;
  cur.end = 0;
  cur.bus = moment ? loud : normal;
  try {
    SYNTH[name](a);
  } catch {
    /* a closed or interrupted context: stay quiet */
    return;
  }
  lastAt.set(name, now);
  voices.push(now + cur.end * 1000);
  if (moment) {
    const g = normal.gain;
    const t = a.currentTime;
    g.cancelScheduledValues?.(t);
    g.setValueAtTime(DUCK, t);
    g.setValueAtTime(DUCK, t + cur.end);
    g.linearRampToValueAtTime(1, t + cur.end + 0.3);
  }
}

/** Plays one sound if Spades' mode allows it, audio is unlocked and the page is visible. Never throws. */
export function sfx(name: SoundName, mine = false) {
  if (audible(mode, mine)) play(name);
}

/** Whether the platform setting lets a sound of this tier play: "Big moments" keeps only the moments. */
export const tierAudible = (level: SoundLevel, tier: SoundTier) =>
  level === 'all' || (level === 'moments' && tier === 'moment');

/** What the e2e suite reads: the cues that passed the setting, in order (`window.__fxLog`). Not in production builds. */
export interface CueLogEntry {
  name: SoundName;
  tier: SoundTier;
  at: number;
  pitch?: number;
}
const LOG_MAX = 200;
function record(e: CueLogEntry) {
  const w = window as unknown as { __fxLog?: CueLogEntry[] };
  const log = (w.__fxLog ??= []);
  log.push(e);
  if (log.length > LOG_MAX) log.shift();
}

/**
 * Plays a sound under the platform's Sounds setting (every game but Spades, whose own mode wins there). `tier`
 * overrides the sound's own, for a sound used at a smaller moment (a small unlock's chime is a beat).
 */
export function cue(name: SoundName, tier: SoundTier = SOUND_TIER[name], o: CueOpts = {}) {
  armAudio();
  if (!tierAudible(readFx().sounds, tier)) return;
  if (import.meta.env.DEV || import.meta.env.VITE_FX_LOG)
    record({ name, tier, at: Math.round(clock()), ...(o.pitch ? { pitch: o.pitch } : {}) });
  play(name, o);
}

/** The Sound Board's play button: ignores the setting and the tier, keeps the limiter. */
export function preview(name: SoundName, o: CueOpts = {}) {
  armAudio();
  play(name, o);
}
