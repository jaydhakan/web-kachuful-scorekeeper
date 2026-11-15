import { fireEvent, render, screen } from '@testing-library/react';
import type { IshaaraSummaryOut } from '@/games/ishaara/sync/types';
import { started } from '@/games/ishaara/domain/__fixtures__/kit';
import type { IshaaraPublic } from '@/games/ishaara/domain';
import { IshaaraProvider, type IshaaraNav } from '@/games/ishaara/state/store';
import { setSession } from '@/sync/session';
import IshaaraShell from './IshaaraShell';

const serve = (game: IshaaraPublic) =>
  vi.stubGlobal('fetch', async (url: string) =>
    String(url).includes('/api/ishaara/games/')
      ? new Response(JSON.stringify({ game, me: { host: true, team: null }, serverNow: 1 }))
      : new Response(JSON.stringify({ items: [], nextCursor: null })),
  );
const show = (initial: IshaaraNav) =>
  render(
    <IshaaraProvider initial={initial}>
      <IshaaraShell />
    </IshaaraProvider>,
  );

beforeEach(() =>
  setSession({ user: { id: 'u1', email: 'a@b.c', role: 'member', playerId: null }, player: null }),
);
afterEach(() => vi.unstubAllGlobals());

describe('Ishaara’s shell', () => {
  it('goes from the hub to setup', async () => {
    serve(started().state);
    show({ screen: 'home', gameId: null, role: 'table' });
    expect(screen.getByRole('heading', { name: 'Ishaara' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New game' }));
    expect(await screen.findByRole('heading', { name: 'Teams' })).toBeInTheDocument();
  });

  it('opens a game on the screen for its status: waiting, then the board', async () => {
    const g = started().state;
    serve({ ...g, status: 'waiting', joined: { sun: true, moon: false } });
    const { unmount } = show({ screen: 'waiting', gameId: g.id, role: 'table' });
    // Two panes: the title is drawn in both and CSS (absent here) hides one.
    expect(
      (await screen.findAllByRole('heading', { name: 'Waiting for clue-givers' })).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Joined')).toBeInTheDocument();
    unmount();
    serve(g);
    show({ screen: 'waiting', gameId: g.id, role: 'table' });
    expect(await screen.findByRole('list', { name: 'Words' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Waiting for clue-givers' })).toBeNull();
  });

  it('a loaded board whose game is deleted says so instead of reconnecting (ISH-F23)', async () => {
    const g = started().state;
    let gone = false;
    vi.stubGlobal('fetch', async (url: string) =>
      String(url).includes('/events')
        ? new Response(null, { status: gone ? 404 : 200 })
        : String(url).includes('/api/ishaara/games/')
          ? new Response(JSON.stringify({ game: g, me: { host: true, team: null }, serverNow: 1 }))
          : new Response(JSON.stringify({ items: [], nextCursor: null })),
    );
    gone = true;
    show({ screen: 'board', gameId: g.id, role: 'table' });
    expect(await screen.findByText('This game is gone')).toBeInTheDocument();
  });

  it('after a key, Home’s New game opens setup, not the clue list (ISH-F12)', async () => {
    serve(started().state);
    show({ screen: 'clue-list', gameId: null, role: 'clue' });
    fireEvent.click(await screen.findByRole('button', { name: 'Back to Ishaara' }));
    fireEvent.click(await screen.findByRole('button', { name: 'New game' }));
    expect(await screen.findByRole('heading', { name: 'Teams' })).toBeInTheDocument();
  });
});

const row = (o: Partial<IshaaraSummaryOut>): IshaaraSummaryOut => {
  const g = started().state;
  return {
    id: g.id,
    createdAt: 1,
    updatedAt: 1,
    finishedAt: null,
    status: 'active',
    turn: 'sun',
    starting: 'sun',
    winner: null,
    endedBy: null,
    match: g.match,
    wordsLeft: { sun: 9, moon: 8 },
    revealed: 0,
    host: { name: 'Jay' },
    players: g.players.map((p) => ({ ...p, playerId: p.playerId ?? '' })),
    myTeam: null,
    isHost: true,
    ...o,
  };
};
const listing = (item: IshaaraSummaryOut) =>
  vi.stubGlobal('fetch', async (url: string) =>
    String(url).includes('/api/ishaara/games/')
      ? new Response(
          JSON.stringify({ game: started().state, me: { host: true, team: null }, serverNow: 1 }),
        )
      : new Response(JSON.stringify({ items: [item], nextCursor: null })),
  );

describe('Ishaara’s home, games in progress', () => {
  it('a host who gives clues can open the board or the key (ISH-F01)', async () => {
    listing(row({ myTeam: 'sun' }));
    show({ screen: 'home', gameId: null, role: 'table' });
    expect(await screen.findByText('You host and give Sun’s clues')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open the board' }));
    expect(await screen.findByRole('list', { name: 'Words' })).toBeInTheDocument();
  });

  it('the host’s key opens the clue screens, not the board', async () => {
    listing(row({ myTeam: 'sun' }));
    show({ screen: 'home', gameId: null, role: 'table' });
    fireEvent.click(await screen.findByRole('button', { name: 'Open my key' }));
    expect(await screen.findByRole('button', { name: 'Show key' })).toBeInTheDocument();
  });

  it('someone else’s table says it is only watched', async () => {
    listing(row({ isHost: false }));
    show({ screen: 'home', gameId: null, role: 'table' });
    expect(await screen.findByText('Watching Jay’s table')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open the board' })).toBeNull();
  });
});
