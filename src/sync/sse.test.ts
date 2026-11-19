import { followStream, RESUME_MS, SILENCE_MS } from './sse';

/** The shared fetch-SSE reader: a phone coming back to the page reopens a stream that has gone quiet. */
function stream() {
  const f = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () =>
      new Response(new ReadableStream({ start: () => {} }), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
  );
  vi.stubGlobal('fetch', f);
  return f;
}
const visibility = (state: 'hidden' | 'visible') => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
  document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('followStream on coming back to the page', () => {
  it('opens a new request when the page returns after a quiet spell', async () => {
    const f = stream();
    const stop = followStream('/s', { onFrame: () => {} });
    await vi.advanceTimersByTimeAsync(0);
    expect(f).toHaveBeenCalledTimes(1);
    visibility('hidden');
    await vi.advanceTimersByTimeAsync(RESUME_MS + 1000);
    visibility('visible');
    await vi.advanceTimersByTimeAsync(0);
    expect(f).toHaveBeenCalledTimes(2);
    stop();
  });

  it('leaves a stream that spoke a moment ago alone, and does nothing while hidden', async () => {
    const f = stream();
    const stop = followStream('/s', { onFrame: () => {} });
    await vi.advanceTimersByTimeAsync(0);
    visibility('visible');
    await vi.advanceTimersByTimeAsync(0);
    expect(f).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(RESUME_MS + 1000);
    visibility('hidden');
    await vi.advanceTimersByTimeAsync(0);
    expect(f).toHaveBeenCalledTimes(1);
    stop();
  });

  it('comes back from the back-forward cache with a new request even if it was quick', async () => {
    const f = stream();
    const stop = followStream('/s', { onFrame: () => {} });
    await vi.advanceTimersByTimeAsync(0);
    visibility('visible');
    const e = new Event('pageshow');
    Object.defineProperty(e, 'persisted', { value: true });
    window.dispatchEvent(e);
    await vi.advanceTimersByTimeAsync(0);
    expect(f).toHaveBeenCalledTimes(2);
    stop();
  });

  it('does not retry the replaced request, and a dead stream still reopens after the silence limit', async () => {
    const f = stream();
    const conn = vi.fn();
    const stop = followStream('/s', { onFrame: () => {}, onConn: conn });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(RESUME_MS + 1000);
    visibility('visible');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(f).toHaveBeenCalledTimes(2);
    expect(conn).not.toHaveBeenCalledWith(false);
    await vi.advanceTimersByTimeAsync(SILENCE_MS);
    expect(f.mock.calls.length).toBeGreaterThanOrEqual(3);
    stop();
  });

  it('stops listening once stopped', async () => {
    const f = stream();
    const stop = followStream('/s', { onFrame: () => {} });
    await vi.advanceTimersByTimeAsync(0);
    stop();
    await vi.advanceTimersByTimeAsync(RESUME_MS + 1000);
    visibility('visible');
    await vi.advanceTimersByTimeAsync(0);
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('followStream pings', () => {
  it("hands a ping's data to onPing, besides onFrame, and other events only to onFrame", async () => {
    const enc = new TextEncoder();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(c) {
                c.enqueue(enc.encode('event: state\ndata: {}\n\nevent: ping\ndata: {"rev":7}\n\n'));
              },
            }),
            { status: 200 },
          ),
      ),
    );
    const pings: string[] = [];
    const frames: string[] = [];
    const stop = followStream('/s', {
      onFrame: (f) => frames.push(f.event),
      onPing: (d) => pings.push(d),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(pings).toEqual(['{"rev":7}']);
    expect(frames).toEqual(['state', 'ping']);
    stop();
  });
});
