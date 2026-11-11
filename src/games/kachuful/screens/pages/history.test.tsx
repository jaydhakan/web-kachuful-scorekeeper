import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { demoGame, type Game } from '@/games/kachuful/domain';
import { App } from '@/App';
// The shell and the pages it opens are lazy chunks; loaded up front so transforming them can't outlast a findBy.
import '@/games/kachuful/components/PhoneShell';
import '@/games/kachuful/screens/pages/Pages';
import { archive, archiveGame } from '@/state/archive';
import { KEYS } from '@/state/persistence';

const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const game = (syncId: string, patch: Partial<Game> = {}): Game => ({
  ...demoGame(),
  id: 'g-' + syncId,
  syncId,
  ...patch,
});

describe('History and the game view', () => {
  it('says there are no games yet, and offers a new one', async () => {
    const u = setup();
    render(<App />);
    await u.click(await screen.findByRole('button', { name: /History/ }));
    expect(await screen.findByText('No games yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New game' })).toBeInTheDocument();
  });

  it('lists kept games, filters by player and opens one', async () => {
    await archive.ready;
    const fin = game('a', { status: 'finished', finishedAt: Date.now() - 1000 });
    fin.rounds = fin.rounds.filter((r) => r.phase === 'done');
    archiveGame(fin);
    archiveGame(
      game('b', { players: game('b').players.map((p, i) => ({ ...p, name: 'Zed' + i })) }),
    );
    const u = setup();
    render(<App />);
    await u.click(await screen.findByRole('button', { name: /History/ }));
    expect(await screen.findAllByRole('button', { name: /^Game on/ })).toHaveLength(2);
    await u.click(screen.getByRole('button', { name: 'Zed0' }));
    expect(screen.getAllByRole('button', { name: /^Game on/ })).toHaveLength(1);
    await u.click(screen.getByRole('button', { name: 'Everyone' }));
    await u.click(screen.getByRole('button', { name: /^Game on .*won/ }));
    expect(await screen.findByText('Round by round')).toBeInTheDocument();
    expect(screen.getByText('Standings')).toBeInTheDocument();
    // The history page animates out while the game page comes in.
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Back' })).toHaveLength(1));
    await u.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('History')).toBeInTheDocument();
  });

  it('filters by date range, and clears the filters when nothing matches', async () => {
    await archive.ready;
    const done = (id: string, at: number, name: string) => {
      const g = game(id, {
        status: 'finished',
        finishedAt: at,
        players: game(id).players.map((p, i) => ({ ...p, name: name + i })),
      });
      g.rounds = g.rounds.filter((r) => r.phase === 'done');
      archiveGame(g);
    };
    done('new', Date.now() - 1000, 'Ann');
    done('old', Date.now() - 40 * 864e5, 'Ole');
    const u = setup();
    render(<App />);
    await u.click(await screen.findByRole('button', { name: /History/ }));
    expect(await screen.findAllByRole('button', { name: /^Game on/ })).toHaveLength(2);
    await u.click(screen.getByRole('button', { name: /^Date range/ }));
    await u.click(await screen.findByRole('button', { name: 'Today' }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /^Game on/ })).toHaveLength(1),
    );
    await u.click(screen.getByRole('button', { name: 'Ole0' }));
    expect(await screen.findByText('No games match these filters')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findAllByRole('button', { name: /^Game on/ })).toHaveLength(2);
  });

  it('continues an unfinished game, keeping the current one in History', async () => {
    await archive.ready;
    archiveGame(game('old'));
    localStorage.setItem(KEYS.game, JSON.stringify({ ...game('cur'), schemaVersion: 3 }));
    const u = setup();
    render(<App />);
    await u.click(await screen.findByRole('button', { name: /History/ }));
    const rows = await screen.findAllByRole('button', { name: /^Game on/ });
    const old = rows.find((r) => !within(r).queryByText('Playing now'))!;
    await u.click(old);
    await u.click(await screen.findByRole('button', { name: 'Continue this game' }));
    await waitFor(() => expect(screen.queryByText('Round by round')).not.toBeInTheDocument());
    expect(archive.get('games', 'cur')).toBeDefined();
  });

  it('deletes a game after asking', async () => {
    await archive.ready;
    archiveGame(game('x'));
    const u = setup();
    render(<App />);
    await u.click(await screen.findByRole('button', { name: /History/ }));
    await u.click((await screen.findAllByRole('button', { name: /^Game on/ }))[0]);
    await u.click(await screen.findByRole('button', { name: 'Delete game' }));
    await u.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('No games yet')).toBeInTheDocument();
    expect(archive.get('games', 'x')!.deleted).toBe(true);
  });
});

describe('History badges, signed in', () => {
  it('marks only the exceptions: a game only on this phone, or not synced yet', async () => {
    const { AppProvider } = await import('@/games/kachuful/state/store');
    const { HistoryPage } = await import('./HistoryPage');
    localStorage.setItem(
      KEYS.session,
      JSON.stringify({
        user: { id: 'u1', email: 'me@test.dev', role: 'member', playerId: null },
        player: null,
      }),
    );
    await archive.ready;
    const fin = (id: string, at: number) => {
      const g = game(id, { status: 'finished', finishedAt: at });
      g.rounds = g.rounds.filter((r) => r.phase === 'done');
      return g;
    };
    const base = { updatedAt: 1, endedAt: 1 };
    const pulled = fin('pulled', 3);
    const synced = fin('synced', 2);
    const behind = fin('behind', 1);
    const here = fin('here', 0);
    archive.put('games', { ...base, syncId: 'pulled', game: pulled, origin: 'remote' });
    archive.put('games', {
      ...base,
      syncId: 'synced',
      game: synced,
      origin: 'local',
      account: 'u1',
      syncedRev: synced.rev,
    });
    archive.put('games', {
      ...base,
      syncId: 'behind',
      game: behind,
      origin: 'local',
      account: 'u1',
      syncedRev: behind.rev - 1,
    });
    archive.put('games', { ...base, syncId: 'here', game: here, origin: 'local' });
    render(
      <AppProvider>
        <HistoryPage />
      </AppProvider>,
    );
    expect(await screen.findAllByRole('button', { name: /^Game on/ })).toHaveLength(4);
    expect(screen.queryByText('From the server')).not.toBeInTheDocument();
    expect(screen.getAllByText('Not synced yet')).toHaveLength(1);
    expect(screen.getAllByText('Only on this phone')).toHaveLength(1);
  });
});

describe('games played in, signed in', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists games others scored with me at the table, not games I only looked at', async () => {
    await archive.ready;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    localStorage.setItem(
      KEYS.session,
      JSON.stringify({
        user: { id: 'u1', email: 'me@test.dev', role: 'member', playerId: 'me' },
        player: { id: 'me', displayName: 'Me', emoji: '🙂', color: '#336699' },
      }),
    );
    const done = (id: string, names: string, seatMe: boolean): Game => {
      const g = game(id, { status: 'finished', finishedAt: Date.now() - 1000 });
      g.rounds = g.rounds.filter((r) => r.phase === 'done');
      g.players = g.players.map((p, i) => ({
        ...p,
        name: names + i,
        playerId: seatMe && i === 0 ? 'me' : names + i,
      }));
      return g;
    };
    archiveGame(done('mine', 'Own', true), { account: 'u1' });
    const remote = (g: Game) => ({
      syncId: g.syncId,
      game: g,
      updatedAt: g.updatedAt,
      endedAt: g.finishedAt!,
      origin: 'remote' as const,
      owner: { id: 'kabir', name: 'Kabir' },
      syncedRev: g.rev,
    });
    archive.put('games', remote(done('sat', 'Sat', true)), remote(done('seen', 'Seen', false)));
    const u = setup();
    render(<App />);
    await u.click(await screen.findByRole('button', { name: /History/ }));
    expect(await screen.findAllByRole('button', { name: /^Game on/ })).toHaveLength(2);
    expect(screen.getByText(/Scored by Kabir/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Played in' }));
    expect(screen.getAllByRole('button', { name: /^Game on/ })).toHaveLength(1);
    await u.click(screen.getByRole('button', { name: 'Scored by me' }));
    expect(screen.getAllByRole('button', { name: /^Game on/ })).toHaveLength(1);
    expect(screen.queryByText(/Scored by Kabir/)).toBeNull();
  });
});
