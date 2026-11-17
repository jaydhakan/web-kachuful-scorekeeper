import { KEYS, storage } from '@/state/persistence';
import { resetFxForTests } from './prefs';
import { armAudio, cue, setSoundMode, sfx, SOUND_TIER, tierAudible, type SoundName } from './sound';

// A stand-in AudioContext that records when each source stops, so a sound's length can be read.
let stops: number[] = [];
class Param {
  value = 0;
  setValueAtTime = () => this;
  linearRampToValueAtTime = () => this;
  exponentialRampToValueAtTime = () => this;
}
const node = () => ({ connect: <T,>(n: T) => n });
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
const length = () => Math.max(...stops) - 0.05;

beforeAll(() => {
  Object.assign(globalThis, { AudioContext: FakeAudio });
  armAudio();
  window.dispatchEvent(new Event('pointerdown'));
});
beforeEach(() => {
  stops = [];
  resetFxForTests();
});

describe('the platform sounds', () => {
  it.each(NEW)('%s lasts at most 0.8s', (name) => {
    storage.set(KEYS.fx, { sounds: 'all', vibrate: true });
    cue(name);
    expect(stops.length).toBeGreaterThan(0);
    expect(length()).toBeLessThanOrEqual(0.8);
  });

  it('"Big moments", the default, plays only moment-tier sounds', () => {
    cue('gavel');
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
    expect(Object.keys(SOUND_TIER)).toHaveLength(19);
    expect(tierAudible('all', 'tick')).toBe(true);
    expect(tierAudible('moments', 'moment')).toBe(true);
    expect(tierAudible('moments', 'beat')).toBe(false);
    expect(tierAudible('off', 'moment')).toBe(false);
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
