import type { Cue } from '@/fx/feedback';
import type { CuePlan } from '@/fx/sequence';
import { forgetHeard, playOnce } from './once';

const PLAN: CuePlan = {
  cues: [
    { at: 0, name: 'made' },
    { at: 100, name: 'crown' },
  ],
  reduced: { name: 'chime' },
};
const played: Cue[] = [];
const play = (c: Cue) => void played.push(c);

beforeEach(() => {
  vi.useFakeTimers();
  played.length = 0;
  forgetHeard();
});
afterEach(() => vi.useRealTimers());

describe('playOnce', () => {
  it('plays a plan on its timings, once per key', async () => {
    playOnce('k', PLAN, { reduced: false, play });
    await vi.advanceTimersByTimeAsync(200);
    expect(played.map((c) => c.name)).toEqual(['made', 'crown']);
    expect(playOnce('k', PLAN, { reduced: false, play })).toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    expect(played).toHaveLength(2);
  });

  it('a StrictMode re-run (cancelled before any cue) still plays', async () => {
    playOnce('s', PLAN, { reduced: false, play })?.cancel();
    playOnce('s', PLAN, { reduced: false, play });
    await vi.advanceTimersByTimeAsync(200);
    expect(played.map((c) => c.name)).toEqual(['made', 'crown']);
  });

  it('an unmount drops what is left, and a remount of the same state stays silent', async () => {
    const run = playOnce('u', PLAN, { reduced: false, play });
    await vi.advanceTimersByTimeAsync(10);
    run?.cancel();
    await vi.advanceTimersByTimeAsync(500);
    expect(played.map((c) => c.name)).toEqual(['made']);
    expect(playOnce('u', PLAN, { reduced: false, play })).toBeNull();
  });

  it('reduced motion plays only the one sound, at once', async () => {
    playOnce('r', PLAN, { reduced: true, play });
    await vi.advanceTimersByTimeAsync(500);
    expect(played.map((c) => c.name)).toEqual(['chime']);
  });

  it('different keys do not share', async () => {
    playOnce('a', PLAN, { reduced: true, play });
    expect(playOnce('b', PLAN, { reduced: true, play })).not.toBeNull();
  });
});
