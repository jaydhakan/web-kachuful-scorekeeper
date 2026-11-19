import { lobby, started } from '@/games/spades/domain/__fixtures__/kit';
import { viewFor, type Seat, type SpPublic } from '@/games/spades/domain';
import type { FollowHandlers } from '../sync/events';
import type { SpViewOut } from '../sync/types';
import {
  MAX_RETRIES,
  RETRY_MS,
  STALE_MS,
  TIMEOUT_MARGIN_MS,
  TIMEOUT_RETRY_MS,
  TableLink,
  WATCH_MS,
} from './link';

/** One table's link: rev ordering, one action at a time, resends after a reconnect, error views, the deadline. */
const L = lobby();
const view = (table: SpPublic, seat: Seat | null = 0, serverNow = Date.now()): SpViewOut => ({
  ...viewFor(table, null, seat, serverNow),
  invites: [null, null, null, null],
});
const at = (rev: number, over: Partial<SpPublic> = {}) => view({ ...L, rev, ...over });

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
  return { f, posts, replies };
}

const made: TableLink[] = [];
function link(online = true) {
  let h!: FollowHandlers;
  const net = { online };
  const l = new TableLink(L.id, {
    follow: (_id, handlers) => {
      h = handlers;
      return () => {};
    },
    online: () => net.online,
  });
  made.push(l);
  return { l, h: () => h, net };
}
const tick = () => new Promise((r) => setTimeout(r, 0));
async function live(rev = 5) {
  const a = api([{ status: 200, body: at(rev) }]);
  const k = link();
  k.l.start();
  await tick();
  k.h().onConn(true);
  return { ...a, ...k };
}

afterEach(() => {
  made.splice(0).forEach((l) => l.stop());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('TableLink', () => {
  it('loads the view, works out the clock offset, and is live once the stream opens', async () => {
    api([{ status: 200, body: view({ ...L, rev: 5 }, 0, Date.now() + 2000) }]);
    const { l, h } = link();
    expect(l.get().status).toBe('loading');
    expect(l.qrUrl).toBeNull();
    l.start();
    await tick();
    expect(l.get().status).toBe('reconnecting');
    expect(l.get().view?.table.rev).toBe(5);
    expect(l.get().clockOffset).toBeGreaterThan(1900);
    expect(l.qrUrl).toBe(`/api/spades/tables/${L.id}/qr.svg`);
    h().onConn(true);
    expect(l.get().status).toBe('live');
    h().onConn(false);
    expect(l.get().status).toBe('reconnecting');
  });

  it('never goes back to an older rev, but takes the same rev for its invites', async () => {
    const { l, h } = await live(5);
    h().onEvent({ type: 'state', view: at(7) });
    h().onEvent({ type: 'state', view: at(6) });
    expect(l.get().view?.table.rev).toBe(7);
    const inv = {
      id: 'i1',
      userId: 'u9',
      name: 'Zoya',
      emoji: '🦉',
      color: '#2dd4bf',
      photoUrl: null,
    };
    h().onEvent({ type: 'state', view: { ...at(7), invites: [null, inv, null, null] } });
    expect(l.get().invites[1]).toEqual({
      inviteId: 'i1',
      userId: 'u9',
      name: 'Zoya',
      emoji: '🦉',
      color: '#2dd4bf',
    });
  });

  it('marks a missing table gone, and a failed first load as an error that can be retried', async () => {
    api([{ status: 404, body: { code: 'not_found' } }]);
    const a = link();
    a.l.start();
    await tick();
    expect(a.l.get().status).toBe('gone');

    api([{ status: 500 }, { status: 200, body: at(3) }]);
    const b = link();
    b.l.start();
    await tick();
    expect(b.l.get().status).toBe('error');
    b.l.reload();
    await tick();
    expect(b.l.get().view?.table.rev).toBe(3);
  });

  it('sends one action with a fresh id and the rev shown, and refuses a second while it is in flight', async () => {
    const { l, posts, replies } = await live(5);
    replies.push({ status: 200, body: at(6) });
    const first = l.act({ type: 'ready' });
    expect(l.get().busy).toBe(true);
    await expect(l.act({ type: 'unready' })).resolves.toBe('refused');
    await expect(first).resolves.toBe('ok');
    expect(l.get()).toMatchObject({ busy: false, lastError: null });
    expect(posts()).toHaveLength(1);
    expect(posts()[0]).toMatchObject({ type: 'ready', rev: 5 });
    expect(String(posts()[0].actionId)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('refuses without sending while the stream is reconnecting', async () => {
    const { l, h, posts } = await live(5);
    h().onConn(false);
    await expect(l.act({ type: 'ready' })).resolves.toBe('offline');
    expect(posts()).toHaveLength(0);
  });

  it('adopts the view an error carries and keeps the reason for a toast', async () => {
    const { l, replies } = await live(5);
    replies.push({
      status: 422,
      body: { code: 'invalid_action', reason: 'not-ready', game: at(8) },
    });
    await expect(l.act({ type: 'drawForDeal' })).resolves.toBe('refused');
    expect(l.get().view?.table.rev).toBe(8);
    expect(l.get().lastError).toBe('not-ready');
    replies.push({ status: 409, body: { code: 'stale', game: at(9) } });
    await l.act({ type: 'ready' });
    expect(l.get()).toMatchObject({ lastError: 'stale', busy: false });
    expect(l.get().view?.table.rev).toBe(9);
  });

  it('resends a lost action with the same id once the stream is back, up to the limit', async () => {
    const { l, h, posts, replies } = await live(5);
    replies.push('network');
    const sent = l.act({ type: 'ready' });
    await tick();
    expect(l.get().busy).toBe(true);
    h().onConn(false);
    replies.push({ status: 200, body: at(6) });
    h().onConn(true);
    await expect(sent).resolves.toBe('ok');
    const [a, b] = posts();
    expect(b.actionId).toBe(a.actionId);

    for (let i = 0; i <= MAX_RETRIES; i++) replies.push('network');
    const lost = l.act({ type: 'unready' });
    for (let i = 0; i < MAX_RETRIES; i++) {
      await tick();
      h().onConn(false);
      h().onConn(true);
    }
    await expect(lost).resolves.toBe('offline');
    expect(l.get()).toMatchObject({ busy: false, lastError: 'offline' });
    expect(RETRY_MS).toBeGreaterThan(0);
  });

  it('counts everyone seated as here until the first presence frame', async () => {
    const { l, h } = await live(5);
    expect(l.get().presence).toEqual([true, true, true, true]);
    h().onEvent({ type: 'presence', seats: [true, false, true, true] });
    expect(l.get().presence).toEqual([true, false, true, true]);
  });

  it('passes reactions to subscribers until they unsubscribe', async () => {
    const { l, h } = await live(5);
    const got = vi.fn();
    const off = l.onReaction(got);
    h().onEvent({ type: 'reaction', seat: 2, emoji: '🔥' });
    off();
    h().onEvent({ type: 'reaction', seat: 2, emoji: '👏' });
    expect(got).toHaveBeenCalledTimes(1);
    expect(got).toHaveBeenCalledWith({ type: 'reaction', seat: 2, emoji: '🔥' });
  });
});

describe('the deadline watcher', () => {
  const playing = (deadline: number, seat: Seat | null = 1) => {
    const t = started().state;
    return view({ ...t, rev: 20, turnStartedAt: deadline - 30_000, deadline }, seat);
  };

  it('sends timeout once the deadline passes on the server clock, and again while it is too early', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const deadline = Date.now() + 5000;
    const a = api([
      { status: 200, body: playing(deadline) },
      {
        status: 422,
        body: { code: 'invalid_action', reason: 'too-early', game: playing(deadline) },
      },
      {
        status: 200,
        body: {
          ...playing(deadline),
          table: { ...playing(deadline).table, rev: 21, deadline: null },
        },
      },
    ]);
    const { l, h } = link();
    l.start();
    await vi.advanceTimersByTimeAsync(0);
    h().onConn(true);
    await vi.advanceTimersByTimeAsync(4000);
    expect(a.posts()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1000 + TIMEOUT_MARGIN_MS);
    expect(a.posts()).toHaveLength(1);
    expect(a.posts()[0]).toMatchObject({ type: 'timeout', rev: 20 });
    // A refused timeout is quiet: no toast.
    expect(l.get().lastError).toBeNull();
    await vi.advanceTimersByTimeAsync(TIMEOUT_RETRY_MS);
    expect(a.posts()).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(a.posts()).toHaveLength(2);
    l.stop();
  });

  it('leaves the deadline to the seated: a watcher without a seat never sends', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const deadline = Date.now() + 1000;
    const a = api([{ status: 200, body: playing(deadline, null) }]);
    const { l, h } = link();
    l.start();
    await vi.advanceTimersByTimeAsync(0);
    h().onConn(true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(a.posts()).toHaveLength(0);
    l.stop();
  });

  it('with the timer off, times out a seat whose phone has been gone for a minute', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const t = started({ rules: { timerSec: null } }).state;
    const v = view({ ...t, rev: 20, turnStartedAt: Date.now(), deadline: null }, 2);
    const a = api([{ status: 200, body: v }]);
    const { l, h } = link();
    l.start();
    await vi.advanceTimersByTimeAsync(0);
    h().onConn(true);
    const turn = t.turn as Seat;
    const seats = [true, true, true, true];
    seats[turn] = false;
    h().onEvent({ type: 'presence', seats });
    await vi.advanceTimersByTimeAsync(59_000);
    expect(a.posts()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1000 + TIMEOUT_MARGIN_MS);
    expect(a.posts()[0]).toMatchObject({ type: 'timeout' });
    l.stop();
  });
});

describe('the stale-view watchdog and coming back to the page', () => {
  const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] as const;
  const inPlay = (rev: number) => view({ ...started().state, rev, deadline: null }, 0);
  const gets = (a: ReturnType<typeof api>) =>
    a.f.mock.calls.filter((c) => c[1]?.method !== 'POST').length;
  const visibility = (state: 'hidden' | 'visible') => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
    document.dispatchEvent(new Event('visibilitychange'));
  };
  afterEach(() => vi.restoreAllMocks());

  async function playing(rev = 20) {
    vi.useFakeTimers({ toFake: [...FAKE] });
    const a = api([
      { status: 200, body: inPlay(rev) },
      { status: 200, body: inPlay(rev + 1) },
      { status: 200, body: inPlay(rev + 2) },
    ]);
    const k = link();
    k.l.start();
    await vi.advanceTimersByTimeAsync(0);
    k.h().onConn(true);
    return { ...a, ...k, a };
  }

  it('reads the table again once nothing has arrived for STALE_MS, and takes the newer view', async () => {
    const { l, a } = await playing();
    expect(gets(a)).toBe(1);
    await vi.advanceTimersByTimeAsync(STALE_MS);
    expect(gets(a)).toBe(1);
    await vi.advanceTimersByTimeAsync(WATCH_MS);
    expect(gets(a)).toBe(2);
    expect(l.get().view?.table.rev).toBe(21);
    expect(l.get().stale).toBe(false);
  });

  it('asks again only every STALE_MS while the table stays quiet', async () => {
    const { a } = await playing();
    await vi.advanceTimersByTimeAsync(STALE_MS + WATCH_MS);
    expect(gets(a)).toBe(2);
    await vi.advanceTimersByTimeAsync(STALE_MS - WATCH_MS);
    expect(gets(a)).toBe(2);
    await vi.advanceTimersByTimeAsync(2 * WATCH_MS);
    expect(gets(a)).toBe(3);
  });

  it('does nothing while frames keep arriving', async () => {
    const { a, h } = await playing();
    for (let i = 1; i <= 6; i++) {
      await vi.advanceTimersByTimeAsync(WATCH_MS);
      h().onEvent({ type: 'state', view: inPlay(20 + i) });
    }
    expect(gets(a)).toBe(1);
  });

  it('leaves a lobby and a hidden page alone', async () => {
    vi.useFakeTimers({ toFake: [...FAKE] });
    const a = api([{ status: 200, body: at(5) }]);
    const k = link();
    k.l.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(gets(a)).toBe(1);
    k.l.stop();

    const b = await playing();
    visibility('hidden');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(gets(b.a)).toBe(1);
  });

  it('is stale while the read is in flight, and a failed read is not repeated on the next tick', async () => {
    vi.useFakeTimers({ toFake: [...FAKE] });
    const a = api([
      { status: 200, body: inPlay(20) },
      'network',
      { status: 200, body: inPlay(22) },
    ]);
    const k = link();
    k.l.start();
    await vi.advanceTimersByTimeAsync(0);
    k.h().onConn(true);
    const seen: boolean[] = [];
    k.l.subscribe(() => seen.push(k.l.get().stale));
    await vi.advanceTimersByTimeAsync(STALE_MS + WATCH_MS);
    expect(seen).toContain(true);
    expect(k.l.get().stale).toBe(false);
    expect(gets(a)).toBe(2);
    await vi.advanceTimersByTimeAsync(WATCH_MS * 2);
    expect(gets(a)).toBe(2);
  });

  it('reads the table when the page becomes visible, once at a time, and not after stop', async () => {
    const { l, a } = await playing();
    visibility('visible');
    visibility('visible');
    await vi.advanceTimersByTimeAsync(0);
    expect(gets(a)).toBe(2);
    visibility('hidden');
    await vi.advanceTimersByTimeAsync(0);
    expect(gets(a)).toBe(2);
    l.stop();
    visibility('visible');
    await vi.advanceTimersByTimeAsync(STALE_MS * 2);
    expect(gets(a)).toBe(2);
  });
});
