import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MOMENT_MAX_MS } from '@/components/ui/motion';
import {
  forgetMoments,
  MomentQueue,
  MomentsProvider,
  PRIORITY,
  type MomentSpec,
  type QueueOpts,
} from './moments';

/** A moment that records when it starts and finishes when the test says so. */
function rig(o: QueueOpts = {}) {
  const log: string[] = [];
  const ends = new Map<string, () => void>();
  const sounds: string[] = [];
  const buzz: unknown[] = [];
  const q = new MomentQueue({
    reduced: () => false,
    playSound: (n, tier) => sounds.push(`${n}:${tier}`),
    vibrate: (p) => buzz.push(p),
    ...o,
  });
  const make = (id: string, priority: number, scope = 's1', extra: Partial<MomentSpec> = {}) =>
    ({
      id,
      tier: 'moment',
      priority,
      scope,
      play: ({ signal }) =>
        new Promise<void>((r) => {
          log.push(id);
          ends.set(id, r);
          signal.addEventListener('abort', () => log.push(`${id}:aborted`));
        }),
      ...extra,
    }) satisfies MomentSpec;
  const finish = async (id: string) => {
    ends.get(id)?.();
    await flush();
  };
  return { q, log, make, finish, sounds, buzz };
}
const flush = () => act(async () => await Promise.resolve().then(() => Promise.resolve()));

beforeEach(() => forgetMoments());

describe('the moment queue', () => {
  it('plays one Moment at a time, highest priority first, among those pushed together', async () => {
    const { q, log, make, finish } = rig();
    q.push(make('small', PRIORITY.smallUnlock, 'a'));
    q.push(make('boston', PRIORITY.verdict, 'b'));
    q.push(make('end', PRIORITY.gameEnd, 'c'));
    q.push(make('big', PRIORITY.bigUnlock, 'd'));
    await flush();
    expect(log).toEqual(['end']);
    expect(q.current?.id).toBe('end');
    await finish('end');
    await finish('boston');
    await finish('big');
    expect(log).toEqual(['end', 'boston', 'big', 'small']);
  });

  it('forgets what it cleared before it played, so a remounted screen can push it again', async () => {
    const { q, log, make, finish } = rig();
    q.push(make('now', PRIORITY.verdict));
    await flush();
    q.push(make('later', PRIORITY.smallUnlock));
    q.clear();
    await flush();
    expect(q.push(make('now', PRIORITY.verdict))).toBe('duplicate');
    expect(q.push(make('later', PRIORITY.smallUnlock))).toBe('queued');
    await flush();
    await finish('later');
    expect(log).toEqual(['now', 'now:aborted', 'later']);
  });

  it('takes back a Moment that has not started, and leaves one playing', async () => {
    const { q, log, make } = rig();
    q.push(make('a', PRIORITY.verdict));
    await flush();
    q.push(make('b', PRIORITY.smallUnlock));
    q.cancel('a');
    q.cancel('b');
    expect(q.current?.id).toBe('a');
    expect(q.push(make('b', PRIORITY.smallUnlock))).toBe('queued');
    expect(log).toEqual(['a']);
  });

  it('says when it is idle: nothing playing and nothing waiting', async () => {
    const { q, make, finish } = rig();
    let quiet = false;
    await q.idle();
    q.push(make('a', PRIORITY.verdict));
    q.push(make('b', PRIORITY.smallUnlock));
    void q.idle().then(() => (quiet = true));
    await flush();
    await finish('a');
    expect(quiet).toBe(false);
    await finish('b');
    expect(quiet).toBe(true);
  });

  it('plays a moment pushed under StrictMode once', async () => {
    const { StrictMode, useEffect } = await import('react');
    const { q, log, make } = rig();
    function Pusher() {
      const m = make('strict', PRIORITY.bigUnlock);
      useEffect(() => void q.push(m));
      return null;
    }
    render(
      <StrictMode>
        <MomentsProvider queue={q}>
          <Pusher />
        </MomentsProvider>
      </StrictMode>,
    );
    await flush();
    expect(log).toEqual(['strict']);
  });

  it('caps a hand at two Moments; a new scope starts again, and a game end is never capped', async () => {
    const { q, log, make, finish } = rig();
    q.push(make('a', PRIORITY.bigUnlock, 'hand:1'));
    q.push(make('b', PRIORITY.smallUnlock, 'hand:1'));
    q.push(make('c', PRIORITY.smallUnlock, 'hand:1'));
    await flush();
    await finish('a');
    await finish('b');
    expect(log).toEqual(['a', 'b']);
    expect(q.push(make('d', PRIORITY.verdict, 'hand:1'))).toBe('capped');
    expect(q.push(make('e', PRIORITY.gameEnd, 'hand:1'))).toBe('queued');
    expect(q.push(make('f', PRIORITY.smallUnlock, 'hand:2'))).toBe('queued');
    await flush();
    await finish('e');
    expect(log).toEqual(['a', 'b', 'e', 'f']);
  });

  it('drops the lowest when more than two arrive together', async () => {
    const { q, log, make, finish } = rig();
    q.push(make('low', PRIORITY.smallUnlock));
    q.push(make('mid', PRIORITY.bigUnlock));
    q.push(make('top', PRIORITY.verdict));
    await flush();
    await finish('top');
    await finish('mid');
    expect(log).toEqual(['top', 'mid']);
    expect(q.current).toBeNull();
  });

  it('never plays an id twice, even from a new queue (a remount or reconnect)', async () => {
    const { q, log, make, finish } = rig();
    expect(q.push(make('boston:t1:4', PRIORITY.verdict))).toBe('queued');
    expect(q.push(make('boston:t1:4', PRIORITY.verdict))).toBe('duplicate');
    await flush();
    await finish('boston:t1:4');
    const again = rig();
    expect(again.q.push(again.make('boston:t1:4', PRIORITY.verdict))).toBe('duplicate');
    expect(log).toEqual(['boston:t1:4']);
  });

  it('skip() ends the Moment on screen and starts the next', async () => {
    const { q, log, make } = rig();
    q.push(make('one', PRIORITY.verdict, 'a'));
    q.push(make('two', PRIORITY.bigUnlock, 'b'));
    await flush();
    q.skip();
    await flush();
    expect(log).toEqual(['one', 'one:aborted', 'two']);
  });

  it('ends a Moment that runs past its ceiling', async () => {
    vi.useFakeTimers();
    try {
      const { q, log, make } = rig();
      q.push(make('stuck', PRIORITY.verdict, 'a'));
      q.push(make('next', PRIORITY.smallUnlock, 'b'));
      await flush();
      await act(async () => {
        vi.advanceTimersByTime(MOMENT_MAX_MS + 600);
      });
      await flush();
      expect(log).toEqual(['stuck', 'stuck:aborted', 'next']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('plays the still version under reduced motion, and keeps the sound and the haptic', async () => {
    const { q, log, make, sounds, buzz } = rig({ reduced: () => true });
    const still = vi.fn();
    q.push(make('trap', PRIORITY.verdict, 'a', { reduced: still, sound: 'glitch', haptic: [30] }));
    await flush();
    expect(still).toHaveBeenCalledTimes(1);
    expect(log).toEqual([]);
    expect(sounds).toEqual(['glitch:moment']);
    expect(buzz).toEqual([[30]]);
    expect(q.current).toBeNull();
  });

  it('plays Beats at once, beside a Moment, uncapped, with their sound at their own tier', async () => {
    const { q, log, make, sounds } = rig();
    q.push(make('m', PRIORITY.verdict));
    for (const id of ['b1', 'b2', 'b3'])
      expect(q.push(make(id, 0, 's1', { tier: 'beat', sound: 'gavel' }))).toBe('playing');
    await flush();
    expect(log).toEqual(['b1', 'b2', 'b3', 'm']);
    expect(sounds).toEqual(['gavel:beat', 'gavel:beat', 'gavel:beat']);
    expect(q.current?.id).toBe('m');
  });

  it('a sound given as a function plays that way (Spades’ own mode)', async () => {
    const { q, make, sounds } = rig();
    const own = vi.fn();
    q.push(make('x', PRIORITY.verdict, 'a', { sound: own }));
    await flush();
    expect(own).toHaveBeenCalledTimes(1);
    expect(sounds).toEqual([]);
  });
});

describe('MomentsProvider', () => {
  it('lays a skip layer over the screen while a Moment plays; a tap or Escape skips it', async () => {
    const { q, make, log } = rig();
    render(
      <MomentsProvider queue={q}>
        <p>table</p>
      </MomentsProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
    q.push(make('one', PRIORITY.verdict, 'a'));
    q.push(make('two', PRIORITY.bigUnlock, 'b'));
    await flush();
    const u = userEvent.setup();
    await u.click(screen.getByRole('button', { name: 'Skip' }));
    await flush();
    expect(log).toEqual(['one', 'one:aborted', 'two']);
    await u.keyboard('{Escape}');
    await flush();
    expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument();
  });
});
