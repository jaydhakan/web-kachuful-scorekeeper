import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
import { kitGame, rows } from '@/domain/__fixtures__/kit';
import { archive, archiveGame } from '@/state/archive';
import { ensurePlayer } from '@/state/registry';

const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const now = Date.now();

async function seed() {
  await archive.ready;
  for (const n of ['Asha', 'Bo', 'Cy']) ensurePlayer({ name: n, emoji: '🙂', color: 'c' });
  const ids = ['Asha', 'Bo', 'Cy'].map((n) => ensurePlayer({ name: n, emoji: '', color: '' }).id);
  archiveGame(
    kitGame({
      id: 'h1',
      players: ids,
      names: ['Asha', 'Bo', 'Cy'],
      start: now - 3600e3,
      rounds: rows(3, 12, [0]),
      finished: true,
    }),
  );
}

const open = async (u: ReturnType<typeof setup>, name: RegExp) => {
  await u.click((await screen.findAllByRole('button', { name }))[0]);
};

describe('boards, players and awards on this device', () => {
  it('ranks players with more than 10 rounds today, and opens a player page', async () => {
    await seed();
    const u = setup();
    render(<App />);
    await open(u, /Boards/);
    await u.click(await screen.findByRole('button', { name: 'Today' }));
    const first = await screen.findByRole('button', { name: /^#1 Asha/ });
    await u.click(first);
    expect(await screen.findByText('Accuracy by cards')).toBeInTheDocument();
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
  });

  it('lists everyone unranked with their progress on a longer range', async () => {
    await seed();
    const u = setup();
    render(<App />);
    await open(u, /Boards/);
    expect(
      await screen.findByText(/Not ranked yet · more than 50 rounds needed/),
    ).toBeInTheDocument();
    expect(screen.getAllByText('12 / 51 rounds')).toHaveLength(3);
  });

  it('shows the global board as a sign-in prompt when signed out', async () => {
    const u = setup();
    render(<App />);
    await open(u, /Boards/);
    await u.click(await screen.findByRole('button', { name: /Global/ }));
    expect(await screen.findByText('Sign in for the global board')).toBeInTheDocument();
  });

  it("awards today's best and lists players", async () => {
    await seed();
    const u = setup();
    render(<App />);
    await open(u, /Awards/);
    expect(await screen.findByText('Player of the day')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(screen.queryByText('Player of the day')).not.toBeInTheDocument());
    await open(u, /Players/);
    expect(await screen.findByRole('button', { name: /Asha/ })).toBeInTheDocument();
    await u.type(screen.getByRole('searchbox'), 'zz');
    expect(await screen.findByText('No player by that name')).toBeInTheDocument();
  });

  it('the catalogue lights up what was earned', async () => {
    await seed();
    const u = setup();
    render(<App />);
    await open(u, /Boards/);
    await u.click(await screen.findByRole('button', { name: /Asha/ }));
    await u.click(await screen.findByRole('button', { name: 'See all' }));
    expect(await screen.findByText('Perfect game')).toBeInTheDocument();
    expect(screen.getAllByText('Not earned yet').length).toBeGreaterThan(10);
  });
});
