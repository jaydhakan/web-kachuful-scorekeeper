import { started } from '@/games/ishaara/domain/__fixtures__/kit';
import type { FollowHandlers } from '@/games/ishaara/sync/events';
import type { IshaaraGameOut } from '@/games/ishaara/sync/types';
import { archive } from '@/state/archive';
import { GameLink, MAX_RETRIES, RETRY_MS } from './link';

/** The table's link: adopting server state, refusing picks while busy or not live, and retrying lost sends. */
const G = started().state;
const out = (rev: number, over: Partial<IshaaraGameOut['game']> = {}): IshaaraGameOut => ({
  game: { ...G, rev, ...over },
  me: { host: true, team: null },
  serverNow: Date.now() + 2000,
});

type Reply = { status: number; body?: unknown } | 'network';
function api(replies: Reply[]) {
  const f = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
    const r = replies.shift() ?? { status: 500 };
    if (r === 'network') throw new TypeError('network');
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status });
  });
  vi.stubGlobal('fetch', f);
  const posts = () =>
    f.mock.calls
      .filter((c) => c[1]?.method === 'POST')
      .map((c) => JSON.parse(c[1]!.body as string) as Record<string, unknown>);
  return { f, posts };
}

function link(online = true) {
  let h!: FollowHandlers;
  const net = { online };
  const l = new GameLink(G.id, {
    follow: (_id, handlers) => {
      h = handlers;
      return () => {};
    },
    online: () => net.online,
  });
  return { l, h: () => h, net };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('GameLink', () => {
  it('loads the game, works out the clock offset, and goes live with the stream', async () => {
    api([{ status: 200, body: out(5) }]);
    const { l, h } = link();
    expect(l.get().status).toBe('loading');
    l.start();
    await tick();
    expect(l.get()).toMatchObject({ status: 'ready', me: { host: true }, conn: 'reconnecting' });
    expect(l.get().game?.rev).toBe(5);
    expect(l.get().clockOffset).toBeGreaterThan(1900);
    h().onConn('live');
    expect(l.get().conn).toBe('live');
    // An older frame never replaces a newer state; a newer one does.
    h().onEvent({ type: 'state', game: { ...G, rev: 4 }, serverNow: Date.now() });
    expect(l.get().game?.rev).toBe(5);
    h().onEvent({ type: 'state', game: { ...G, rev: 6 }, serverNow: Date.now() });
    expect(l.get().game?.rev).toBe(6);
  });

  it('is gone on 404 and offline when the browser is', async () => {
    api([{ status: 404, body: { code: 'not_found' } }]);
    const { l } = link(false);
    l.start();
    await tick();
    expect(l.get()).toMatchObject({ status: 'gone', conn: 'offline' });
  });

  it('sends with a fresh actionId and the rev shown, and refuses picks while busy or not live', async () => {
    const { f, posts } = api([{ status: 200, body: out(5) }]);
    const { l, h } = link();
    l.start();
    await tick();
    expect(await l.send({ type: 'guess', card: 1 })).toEqual({ ok: false, refused: 'offline' });
    h().onConn('live');
    let answer!: (r: Response) => void;
    f.mockImplementationOnce(() => new Promise<Response>((r) => (answer = r)));
    const first = l.send({ type: 'guess', card: 1 });
    expect(l.get().busy).toBe(true);
    expect(await l.send({ type: 'guess', card: 2 })).toEqual({ ok: false, refused: 'busy' });
    answer(new Response(JSON.stringify(out(6)), { status: 200 }));
    expect(await first).toMatchObject({ ok: true });
    expect(l.get()).toMatchObject({ busy: false, lastError: null });
    expect(l.get().game?.rev).toBe(6);
    expect(posts()).toHaveLength(1);
    expect(posts()[0]).toMatchObject({ type: 'guess', card: 1, rev: 5 });
    expect(posts()[0].actionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each([
    [409, 'stale'],
    [403, 'not_your_turn'],
    [422, 'invalid_action'],
  ])('adopts the game a %i %s carries', async (status, code) => {
    api([
      { status: 200, body: out(5) },
      { status, body: { code, reason: 'revealed', game: out(9) } },
    ]);
    const { l, h } = link();
    l.start();
    await tick();
    h().onConn('live');
    const r = await l.send({ type: 'endTurn' });
    expect(r).toMatchObject({ ok: false, error: { status, code } });
    expect(l.get()).toMatchObject({ busy: false, lastError: { code } });
    expect(l.get().game?.rev).toBe(9);
  });

  it('retries a lost send with the same actionId once the stream is back, up to the limit', async () => {
    const { posts } = api([
      { status: 200, body: out(5) },
      'network',
      { status: 200, body: out(6) },
    ]);
    const { l, h } = link();
    l.start();
    await tick();
    h().onConn('live');
    h().onConn('reconnecting');
    // Not live: refused on the device. Back live, and the send is lost on the way.
    h().onConn('live');
    const p = l.send({ type: 'guess', card: 3 });
    await tick();
    expect(l.get().busy).toBe(true);
    h().onConn('reconnecting');
    expect(await l.send({ type: 'guess', card: 4 })).toMatchObject({ refused: 'busy' });
    h().onConn('live');
    expect(await p).toMatchObject({ ok: true });
    expect(posts().map((b) => b.actionId)).toEqual([posts()[0].actionId, posts()[0].actionId]);
    expect(l.get().busy).toBe(false);
  });

  it('surfaces the error after the last retry', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    api([{ status: 200, body: out(5) }, 'network', 'network', 'network', 'network']);
    const { l, h } = link();
    l.start();
    await vi.advanceTimersByTimeAsync(0);
    h().onConn('live');
    const p = l.send({ type: 'endTurn' });
    await vi.advanceTimersByTimeAsync(RETRY_MS * (MAX_RETRIES + 1));
    expect(await p).toMatchObject({ ok: false, error: { offline: true } });
    expect(l.get()).toMatchObject({ busy: false, lastError: { code: 'offline' } });
  });

  it('keeps a finished game for History', async () => {
    api([{ status: 200, body: out(5) }]);
    const { l, h } = link();
    l.start();
    await tick();
    expect(archive.ishaaraGames()).toHaveLength(0);
    h().onEvent({
      type: 'state',
      game: { ...G, rev: 7, status: 'finished', solution: [], finishedAt: 10 },
      serverNow: 1,
    });
    expect(archive.ishaaraGames().map((r) => r.syncId)).toEqual([G.id]);
  });
});
