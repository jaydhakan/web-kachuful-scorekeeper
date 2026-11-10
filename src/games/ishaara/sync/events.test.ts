import { started } from '@/games/ishaara/domain/__fixtures__/kit';
import { BACKOFF, followIshaara, parseFrames, SILENCE_MS, type IshaaraEvent } from './events';

/** A response whose body the test writes to, standing in for the server's event stream. */
function stream(status = 200) {
  let ctl!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start: (c) => void (ctl = c) });
  const enc = new TextEncoder();
  return {
    res: new Response(status === 200 ? body : null, { status }),
    write: (s: string) => ctl.enqueue(enc.encode(s)),
    end: () => ctl.close(),
  };
}

const G = started().state;
const state = (rev: number) =>
  `event: state\nid: ${rev}\ndata: ${JSON.stringify({ game: { ...G, rev }, serverNow: 5 })}\n\n`;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('parseFrames', () => {
  it('splits whole frames, keeps the tail, and skips comments', () => {
    const { frames, rest } = parseFrames(
      ': hi\r\nevent: joined\r\ndata: {"team":"sun"}\r\n\r\nevent: ping\ndata: {}\n\nevent: st',
    );
    expect(frames).toEqual([
      { event: 'joined', id: null, data: '{"team":"sun"}' },
      { event: 'ping', id: null, data: '{}' },
    ]);
    expect(rest).toBe('event: st');
  });
});

describe('followIshaara', () => {
  it('reports live, passes frames on, and reconnects with backoff and Last-Event-ID', async () => {
    vi.useFakeTimers();
    const streams = [stream(), stream(), stream()];
    const f = vi.fn(async () => streams[f.mock.calls.length - 1].res);
    vi.stubGlobal('fetch', f);
    const events: IshaaraEvent[] = [];
    const conns: string[] = [];
    const stop = followIshaara('g1', {
      onEvent: (e) => events.push(e),
      onConn: (c) => conns.push(c),
      onGone: () => conns.push('gone'),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(conns).toEqual(['live']);
    streams[0].write(state(4).slice(0, 20));
    streams[0].write(state(4).slice(20) + 'event: joined\ndata: {"team":"moon"}\n\n');
    await vi.advanceTimersByTimeAsync(0);
    expect(events).toEqual([
      { type: 'state', game: { ...G, rev: 4 }, serverNow: 5 },
      { type: 'joined', team: 'moon' },
    ]);
    streams[0].end();
    await vi.advanceTimersByTimeAsync(0);
    expect(conns).toEqual(['live', 'reconnecting']);
    expect(f).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(BACKOFF[0]);
    expect(f).toHaveBeenCalledTimes(2);
    const [url, init] = f.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe('/api/ishaara/games/g1/events');
    expect((init.headers as Record<string, string>)['Last-Event-ID']).toBe('4');
    expect(conns.at(-1)).toBe('live');
    // A stream that goes silent past the pings is dropped and retried.
    await vi.advanceTimersByTimeAsync(SILENCE_MS);
    expect(conns.at(-1)).toBe('reconnecting');
    stop();
    await vi.advanceTimersByTimeAsync(BACKOFF.at(-1)!);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('backs off further after each failed attempt, and stops for good on 404', async () => {
    vi.useFakeTimers();
    let n = 0;
    const f = vi.fn(async () => {
      if (++n < 4) throw new TypeError('network');
      return stream(404).res;
    });
    vi.stubGlobal('fetch', f);
    const conns: string[] = [];
    followIshaara('g1', {
      onEvent: () => {},
      onConn: (c) => conns.push(c),
      onGone: (s) => conns.push(`gone ${s}`),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(f).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(BACKOFF[0]);
    expect(f).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(BACKOFF[1] - 1);
    expect(f).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1 + BACKOFF[2]);
    expect(f).toHaveBeenCalledTimes(4);
    expect(conns).toEqual(['reconnecting', 'gone 404']);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(f).toHaveBeenCalledTimes(4);
  });
});
