import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { finishedDemo, liveDemo } from '@/games/kaali-teeri/test/render';
import { readKtViewerLink } from './entry';
import Viewer from './Viewer';

/** A fake EventSource the test drives: `emit` sends a named event to the open stream. */
class FakeES {
  static last: FakeES | null = null;
  readyState = 1;
  url: string;
  onerror: (() => void) | null = null;
  private on = new Map<string, (e: MessageEvent) => void>();
  constructor(url: string) {
    this.url = url;
    FakeES.last = this;
  }
  addEventListener(name: string, f: (e: MessageEvent) => void) {
    this.on.set(name, f);
  }
  emit(name: string, data: unknown) {
    this.on.get(name)?.(new MessageEvent(name, { data: JSON.stringify(data) }));
  }
  close() {
    this.readyState = 2;
  }
  static CLOSED = 2;
}

const summary = (g: ReturnType<typeof liveDemo>) => ({
  id: g.syncId,
  kind: 'kaali-teeri',
  owner: { id: null, name: 'Jay' },
  players: g.players.map((p) => ({ playerId: p.playerId ?? null, photoUrl: null })),
});
const body = (g: ReturnType<typeof liveDemo>, extra = {}) => ({
  kind: 'kaali-teeri',
  game: g,
  summary: summary(g),
  updatedAt: Date.now(),
  scorerSeenAt: Date.now(),
  ...extra,
});

function serve(routes: Record<string, [number, unknown]>) {
  const f = vi.fn(async (url: string) => {
    const [status, b] = routes[url] ?? [404, { code: 'not_found' }];
    return new Response(JSON.stringify(b), { status });
  });
  vi.stubGlobal('fetch', f);
  return f;
}

beforeEach(() => {
  vi.stubGlobal('EventSource', FakeES);
  FakeES.last = null;
});
afterEach(() => vi.unstubAllGlobals());

describe('the public Kaali Teeri viewer', () => {
  it('reads ?live= once and takes it out of the address bar', () => {
    history.replaceState(null, '', '/kaali-teeri?live=abc&x=1');
    expect(readKtViewerLink()).toEqual({ kind: 'live', token: 'abc' });
    expect(location.search).toBe('?x=1');
    history.replaceState(null, '', '/kaali-teeri');
    expect(readKtViewerLink()).toBeNull();
  });

  it('shows the live table and follows the scorer’s uploads', async () => {
    const g = liveDemo();
    serve({ '/api/public/live/tok': [200, body(g)] });
    render(<Viewer link={{ kind: 'live', token: 'tok' }} onClose={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Connecting…');
    expect(await screen.findByRole('heading', { name: 'Live table' })).toBeInTheDocument();
    expect(screen.getAllByText('Riya').length).toBeGreaterThan(0);
    expect(FakeES.last!.url).toBe('/api/public/live/tok/events');
    expect(screen.getByText('Standings')).toBeInTheDocument();
    const done = finishedDemo();
    act(() => FakeES.last!.emit('game', body(done, { recapToken: 'rec' })));
    expect(await screen.findByRole('heading', { name: 'Game over' })).toBeInTheDocument();
    expect(screen.getByText('Final standings')).toBeInTheDocument();
    act(() => FakeES.last!.emit('watchers', { n: 3 }));
    expect(screen.getByText('3 watching')).toBeInTheDocument();
  });

  it('hands a finished live table off to its recap', async () => {
    const done = finishedDemo();
    serve({
      '/api/public/live/tok': [200, body(done, { recapToken: 'rec' })],
      '/api/public/recap/rec': [200, { ...body(done), achievements: [] }],
    });
    render(<Viewer link={{ kind: 'live', token: 'tok' }} onClose={() => {}} />);
    await userEvent.setup().click(await screen.findByRole('button', { name: 'See the recap' }));
    expect(await screen.findByRole('heading', { name: 'Game recap' })).toBeInTheDocument();
    expect(screen.getAllByText(/^Hand \d/)).toHaveLength(4);
  });

  it('says so when a link is turned off, unknown, members only or for another game', async () => {
    serve({
      '/api/public/recap/off': [410, { code: 'gone' }],
      '/api/public/live/mem': [401, { code: 'members_only' }],
      '/api/public/recap/kf': [200, { kind: 'kachuful', game: {}, summary: {} }],
    });
    const cases: [string, 'live' | 'recap', RegExp][] = [
      ['off', 'recap', /recap link was turned off/],
      ['nope', 'recap', /No game at this link/],
      ['mem', 'live', /Sign in to watch this table/],
      ['kf', 'recap', /link is for another game/],
    ];
    for (const [token, kind, text] of cases) {
      const r = render(<Viewer link={{ kind, token }} onClose={() => {}} />);
      expect(await screen.findByRole('alert')).toHaveTextContent(text);
      r.unmount();
    }
  });

  it('opens the app with its button', async () => {
    serve({});
    const close = vi.fn();
    render(<Viewer link={{ kind: 'recap', token: 'x' }} onClose={close} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open Kaali Teeri' }));
    expect(close).toHaveBeenCalled();
  });
});
