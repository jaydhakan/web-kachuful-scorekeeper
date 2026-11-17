import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Countdown, secsUntil, useServerClock } from './useServerClock';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});
afterEach(() => vi.useRealTimers());

describe('useServerClock', () => {
  it('re-renders only when the selected value changes', () => {
    let renders = 0;
    function Probe({ deadline }: { deadline: number }) {
      renders++;
      const late = useServerClock(0, true, (now) => now >= deadline);
      return <p>{late ? 'late' : 'on time'}</p>;
    }
    render(<Probe deadline={1_003_000} />);
    expect(screen.getByText('on time')).toBeTruthy();
    const before = renders;
    act(() => vi.advanceTimersByTime(2_750));
    expect(renders).toBe(before);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText('late')).toBeTruthy();
    expect(renders).toBe(before + 1);
  });

  it('adds the server offset and stops sampling when inactive', () => {
    function Probe({ active }: { active: boolean }) {
      return <p>{useServerClock(5_000, active, (now) => secsUntil(1_010_000, now))}</p>;
    }
    const { rerender } = render(<Probe active={false} />);
    expect(screen.getByText('5')).toBeTruthy();
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.getByText('5')).toBeTruthy();
    rerender(<Probe active />);
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('reads a new deadline at once', () => {
    function Probe({ deadline }: { deadline: number }) {
      return <p>{useServerClock(0, true, (now) => secsUntil(deadline, now))}</p>;
    }
    const { rerender } = render(<Probe deadline={1_004_000} />);
    expect(screen.getByText('4')).toBeTruthy();
    rerender(<Probe deadline={1_030_000} />);
    expect(screen.getByText('30')).toBeTruthy();
  });
});

describe('Countdown', () => {
  it('counts whole seconds down to 0 and never below', () => {
    render(
      <Countdown deadline={1_002_500} offset={0}>
        {(s) => `${s}s`}
      </Countdown>,
    );
    expect(screen.getByText('3s')).toBeTruthy();
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByText('2s')).toBeTruthy();
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByText('0s')).toBeTruthy();
  });
});
