import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(
      await screen.findByRole('heading', { name: 'Waiting for clue-givers' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Joined')).toBeInTheDocument();
    unmount();
    serve(g);
    show({ screen: 'waiting', gameId: g.id, role: 'table' });
    expect(await screen.findByRole('list', { name: 'Words' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Waiting for clue-givers' })).toBeNull();
  });
});
