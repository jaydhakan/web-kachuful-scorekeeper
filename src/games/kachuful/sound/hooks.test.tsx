import { renderHook } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import type { Game } from '@/games/kachuful/domain';
import { kitGame } from '@/games/kachuful/domain/__fixtures__/kit';
import { forgetHeard } from './once';
import { useLiveSound, useWinnerSound } from './hooks';

const cue = vi.hoisted(() => vi.fn());
const rm = vi.hoisted(() => ({ on: false }));
// A plain factory: with an async one, vitest answers only the first of two dynamic imports.
vi.mock('@/fx/sound', () => ({ cue }));
vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => rm.on,
}));

const names = () => cue.mock.calls.map((c) => c[0]);
const flush = (ms: number) => vi.advanceTimersByTimeAsync(ms);
const game = (rounds: boolean[][], finished = false): Game =>
  kitGame({
    id: 'live',
    players: ['a', 'b', 'c', 'd'],
    rounds: rounds.map((made) => ({ made })),
    start: 1000,
    finished,
  });

beforeEach(() => {
  vi.useFakeTimers();
  cue.mockClear();
  rm.on = false;
  forgetHeard();
});
afterEach(() => vi.useRealTimers());

describe('useWinnerSound', () => {
  const RANKS = [1, 2, 3, 4];
  const run = (fresh: boolean, key = 'win:1', strict = false) =>
    renderHook(() => useWinnerSound(RANKS, fresh, key), {
      wrapper: strict
        ? ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>
        : undefined,
    });

  it('thuds, builds on a roll and lands the fanfare for a game that just finished', async () => {
    run(true);
    await flush(5000);
    expect(names()).toEqual(['thud', 'roll', 'thud', 'fanfare']);
  });

  it('plays once under StrictMode, and not again when the screen remounts', async () => {
    const a = run(true, 'win:2', true);
    await flush(5000);
    expect(names().filter((n) => n === 'fanfare')).toHaveLength(1);
    a.unmount();
    run(true, 'win:2');
    await flush(5000);
    expect(names().filter((n) => n === 'fanfare')).toHaveLength(1);
  });

  it('a reopened finished game (not fresh) is silent', async () => {
    run(false);
    await flush(5000);
    expect(cue).not.toHaveBeenCalled();
  });

  it('reduced motion plays the fanfare once, at once', async () => {
    rm.on = true;
    run(true, 'win:3');
    await flush(10);
    expect(names()).toEqual(['fanfare']);
  });

  it('leaving the screen drops the sounds still to come', async () => {
    const a = run(true, 'win:4');
    await flush(600);
    a.unmount();
    await flush(5000);
    expect(names()).not.toContain('fanfare');
  });
});

describe('useLiveSound: only news that arrives live is heard', () => {
  it('the first state is history, a later round lands its sound, a repeat is silent', async () => {
    const before = game([[true, false, true, true]]);
    const { rerender } = renderHook(({ g }) => useLiveSound(g), { initialProps: { g: before } });
    await flush(10);
    expect(cue).not.toHaveBeenCalled();
    rerender({ g: { ...before } });
    await flush(10);
    expect(cue).not.toHaveBeenCalled();
    rerender({
      g: game([
        [true, false, true, true],
        [true, true, true, false],
      ]),
    });
    await flush(10);
    expect(cue).toHaveBeenCalledTimes(1);
  });

  it('a finished game plays the fanfare, once, even under StrictMode', async () => {
    const live = game([[true, false, true, true]]);
    const { rerender } = renderHook(({ g }) => useLiveSound(g), {
      initialProps: { g: live },
      wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
    });
    rerender({
      g: game(
        [
          [true, false, true, true],
          [false, true, true, true],
        ],
        true,
      ),
    });
    await flush(10);
    expect(names()).toEqual(['fanfare']);
  });

  it('a connecting page with no game makes no sound', async () => {
    renderHook(() => useLiveSound(null));
    await flush(10);
    expect(cue).not.toHaveBeenCalled();
  });
});
