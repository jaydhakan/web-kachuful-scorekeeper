import { KEYS, storage } from '@/state/persistence';
import { resetFxForTests } from './prefs';
import {
  armAudio,
  cue,
  preview,
  resetLimiterForTests,
  setSoundMode,
  sfx,
  SOUND_TIER,
  tierAudible,
  type SoundName,
} from './sound';

// A stand-in AudioContext that records when each source stops, so a sound's length can be read.
let stops: number[] = [];
const freqs: number[] = [];
class Param {
  value = 0;
  setValueAtTime = (v?: number) => (freqs.push(v as number), this);
  linearRampToValueAtTime = () => this;
  exponentialRampToValueAtTime = () => this;
}
const node = () => ({ connect: <T>(n: T) => n });
const source = () => ({
  ...node(),
  type: '',
  buffer: null,
  frequency: new Param(),
  start: () => undefined,
  stop: (t: number) => stops.push(t),
});
class FakeAudio {
  currentTime = 0;
  sampleRate = 8000;
  state = 'running';
  destination = node();
  createGain = () => ({ ...node(), gain: new Param() });
  createOscillator = source;
  createBufferSource = source;
  createBiquadFilter = () => ({ ...node(), type: '', frequency: new Param(), Q: new Param() });
  createBuffer = (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) });
  resume = () => Promise.resolve();
}

const NEW: SoundName[] = ['chime', 'womp', 'gavel', 'roll', 'glitch', 'boom', 'heartbeat'];
const TABLE: SoundName[] = [
  'flick',
  'chip',
  'knock',
  'hook',
  'made',
  'missed',
  'tally',
  'rise',
  'crown',
  'bell',
  'spin',
  'undo',
  'fanfare',
];
const length = () => Math.max(...stops) - 0.05;

beforeAll(() => {
  Object.assign(globalThis, { AudioContext: FakeAudio });
  armAudio();
  window.dispatchEvent(new Event('pointerdown'));
});
beforeEach(() => {
  stops = [];
  freqs.length = 0;
  resetFxForTests();
  resetLimiterForTests();
  vi.useRealTimers();
});

describe('the platform sounds', () => {
  it.each(NEW)('%s lasts at most 0.8s', (name) => {
    storage.set(KEYS.fx, { sounds: 'all', vibrate: true });
    cue(name);
    expect(stops.length).toBeGreaterThan(0);
    expect(length()).toBeLessThanOrEqual(0.8);
  });

  it.each(TABLE)('%s lasts at most 0.8s (the fanfare 1.6s)', (name) => {
    storage.set(KEYS.fx, { sounds: 'all', vibrate: true });
    cue(name);
    expect(stops.length).toBeGreaterThan(0);
    expect(length()).toBeLessThanOrEqual(name === 'fanfare' ? 1.6 : 0.8);
  });

  it('"Big moments", the default, plays only moment-tier sounds', () => {
    cue('crown');
    cue('heartbeat');
    expect(stops).toEqual([]);
    cue('boom');
    expect(stops.length).toBeGreaterThan(0);
  });

  it('a caller can play a sound at a smaller tier (a small unlock’s chime)', () => {
    cue('chime', 'beat');
    expect(stops).toEqual([]);
    cue('chime');
    expect(stops.length).toBeGreaterThan(0);
  });

  it('Off silences every tier', () => {
    storage.set(KEYS.fx, { sounds: 'off', vibrate: true });
    cue('boom');
    expect(stops).toEqual([]);
  });

  it('every sound declares a tier, and the levels gate them', () => {
    expect(Object.keys(SOUND_TIER)).toHaveLength(32);
    expect(tierAudible('all', 'tick')).toBe(true);
    expect(tierAudible('moments', 'moment')).toBe(true);
    expect(tierAudible('moments', 'beat')).toBe(false);
    expect(tierAudible('off', 'moment')).toBe(false);
  });

  it('a pitch offset scales every frequency, and a gain scales the volume', () => {
    storage.set(KEYS.fx, { sounds: 'all', vibrate: true });
    cue('pop');
    const base = freqs.find((f) => f > 100) as number;
    freqs.length = 0;
    resetLimiterForTests();
    cue('pop', 'tick', { pitch: 12 });
    expect(freqs.find((f) => f > 100)).toBeCloseTo(base * 2);
  });

  it('plays a sound at most once every 60ms, and at most eight at once', async () => {
    storage.set(KEYS.fx, { sounds: 'all', vibrate: true });
    cue('pop');
    cue('pop');
    expect(stops).toHaveLength(1);
    stops = [];
    resetLimiterForTests();
    for (const n of ['thud', 'chip', 'flick', 'undo', 'knock', 'made', 'pop', 'deal'] as const)
      cue(n);
    const full = stops.length;
    cue('missed');
    expect(stops).toHaveLength(full);
    cue('bell');
    expect(stops.length).toBeGreaterThan(full);
  });

  it('a moment ducks the other sounds while it rings, and not before', () => {
    storage.set(KEYS.fx, { sounds: 'all', vibrate: true });
    cue('pop');
    cue('bell');
    expect(freqs).toContain(0.5);
  });

  it('the Sound Board previews a sound whatever the setting', () => {
    storage.set(KEYS.fx, { sounds: 'off', vibrate: true });
    preview('knock');
    expect(stops.length).toBeGreaterThan(0);
  });

  it('records the cues that played for the e2e log, and not the muted ones', () => {
    const w = window as unknown as { __fxLog?: { name: string }[] };
    delete w.__fxLog;
    cue('crown');
    expect(w.__fxLog).toBeUndefined();
    storage.set(KEYS.fx, { sounds: 'all', vibrate: true });
    resetFxForTests();
    cue('crown', 'beat', { pitch: 3 });
    expect(w.__fxLog).toMatchObject([{ name: 'crown', tier: 'beat', pitch: 3 }]);
  });

  it('Spades’ own mode wins inside Spades, whatever the platform setting', () => {
    storage.set(KEYS.fx, { sounds: 'off', vibrate: true });
    setSoundMode('all');
    sfx('snap');
    expect(stops.length).toBeGreaterThan(0);
    stops = [];
    setSoundMode('off');
    sfx('boom', true);
    expect(stops).toEqual([]);
    setSoundMode('all');
  });
});
