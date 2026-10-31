import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { demoGame, type Game } from '@/domain';
import { App } from '@/App';
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
