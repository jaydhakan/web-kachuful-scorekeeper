import { FEEL, feedback, HAPTIC } from './feedback';
import { scheduleCues, type CuePlan } from './sequence';

const cue = vi.hoisted(() => vi.fn());
// A plain factory: with an async one, vitest answers only the first of two dynamic imports.
vi.mock('./sound', () => ({ cue }));

const PLAN: CuePlan = {
  cues: [
    { at: 0, name: 'made' },
    { at: 60, name: 'made', pitch: 2 },
    { at: 120, name: 'made', pitch: 4 },
  ],
  reduced: { name: 'chime' },
  settle: { name: 'crown' },
};
const names = () => cue.mock.calls.map((c) => c[0]);
const flush = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
  cue.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('scheduleCues', () => {
  it('plays each cue at its time, with its pitch', async () => {
    scheduleCues(PLAN);
    await vi.advanceTimersByTimeAsync(0);
    expect(names()).toEqual(['made']);
    await vi.advanceTimersByTimeAsync(60);
    expect(cue.mock.calls[1]).toEqual(['made', undefined, { pitch: 2 }]);
    await vi.advanceTimersByTimeAsync(60);
    expect(names()).toEqual(['made', 'made', 'made']);
  });

  it('a skip drops what is left and plays the one settled sound', async () => {
    const run = scheduleCues(PLAN);
    await vi.advanceTimersByTimeAsync(70);
    run.cancel({ settle: true });
    await vi.advanceTimersByTimeAsync(500);
    expect(names()).toEqual(['made', 'made', 'crown']);
  });

  it('an unmount drops what is left and plays nothing', async () => {
    const run = scheduleCues(PLAN);
    run.cancel();
    await vi.advanceTimersByTimeAsync(500);
    expect(cue).not.toHaveBeenCalled();
  });

  it('a cancel before the first timer still catches the cue at 0 (a StrictMode re-run)', async () => {
    scheduleCues(PLAN).cancel();
    await flush();
    expect(cue).not.toHaveBeenCalled();
  });

  it('a skip after the sequence finished plays nothing more', async () => {
    const run = scheduleCues(PLAN);
    await vi.advanceTimersByTimeAsync(500);
    run.cancel({ settle: true });
    await flush();
    expect(names()).toEqual(['made', 'made', 'made']);
  });

  it('reduced motion collapses the run to its one cue, at once', async () => {
    scheduleCues(PLAN, { reduced: true });
    await vi.advanceTimersByTimeAsync(500);
    expect(names()).toEqual(['chime']);
  });

  it('reduced motion with no collapsed cue is silent', async () => {
    scheduleCues({ cues: PLAN.cues }, { reduced: true });
    await vi.advanceTimersByTimeAsync(500);
    expect(cue).not.toHaveBeenCalled();
  });
});

describe('feedback', () => {
  it('every kind names a real sound, and the haptics are the planned patterns', async () => {
    const { SOUND_TIER } = await vi.importActual<typeof import('./sound')>('./sound');
    for (const f of Object.values(FEEL)) expect(SOUND_TIER[f.sound.name]).toBeDefined();
    expect(HAPTIC.NOPE).toEqual([8, 30, 8]);
    expect(HAPTIC.WIN).toEqual([12, 40, 18, 40, 30]);
  });

  it('buzzes and plays together, and the top bid adds its shimmer', async () => {
    const buzz = vi.fn();
    Object.assign(navigator, { vibrate: buzz });
    feedback('raiseTop', { pitch: 7 });
    await vi.dynamicImportSettled();
    expect(buzz).toHaveBeenCalledWith(HAPTIC.BEAT);
    expect(cue.mock.calls).toEqual([
      ['chip', undefined, { pitch: 7 }],
      ['crown', undefined, {}],
    ]);
  });
});
