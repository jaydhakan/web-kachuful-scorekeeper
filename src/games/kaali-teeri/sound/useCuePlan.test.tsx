import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import type { CuePlan } from '@/fx/sequence';
import { forgetCuePlans, useCuePlan } from './useCuePlan';

const cue = vi.hoisted(() => vi.fn());
// A plain factory: with an async one, vitest answers only the first of two dynamic imports.
vi.mock('@/fx/sound', () => ({ cue }));

const PLAN: CuePlan = {
  cues: [
    { at: 0, name: 'made' },
    { at: 100, name: 'tally' },
  ],
  reduced: { name: 'bell' },
};
const names = () => cue.mock.calls.map((c) => c[0]);

function Probe({ k, reduced = false }: { k: string | null; reduced?: boolean }) {
  useCuePlan(k, PLAN, { reduced });
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  cue.mockClear();
  forgetCuePlans();
});
afterEach(() => vi.useRealTimers());

describe('useCuePlan', () => {
  it('plays the plan once, on its timers', async () => {
    render(<Probe k="a" />);
    await vi.advanceTimersByTimeAsync(0);
    expect(names()).toEqual(['made']);
    await vi.advanceTimersByTimeAsync(100);
    expect(names()).toEqual(['made', 'tally']);
  });

  it('never replays on a re-render, a remount or StrictMode’s double effect', async () => {
    const r = render(
      <StrictMode>
        <Probe k="a" />
      </StrictMode>,
    );
    r.rerender(
      <StrictMode>
        <Probe k="a" />
      </StrictMode>,
    );
    await vi.advanceTimersByTimeAsync(200);
    expect(names()).toEqual(['made', 'tally']);
    r.unmount();
    render(<Probe k="a" />);
    await vi.advanceTimersByTimeAsync(200);
    expect(names()).toEqual(['made', 'tally']);
  });

  it('leaving cancels what is left, and a screen that left before anything played can try again', async () => {
    const r = render(<Probe k="a" />);
    r.unmount();
    await vi.advanceTimersByTimeAsync(200);
    expect(names()).toEqual([]);
    const r2 = render(<Probe k="a" />);
    await vi.advanceTimersByTimeAsync(0);
    r2.unmount();
    await vi.advanceTimersByTimeAsync(200);
    expect(names()).toEqual(['made']);
  });

  it('reduced motion plays only the one collapsed sound, at once; no key plays nothing', async () => {
    render(<Probe k="r" reduced />);
    render(<Probe k={null} />);
    await vi.advanceTimersByTimeAsync(200);
    expect(names()).toEqual(['bell']);
  });
});
