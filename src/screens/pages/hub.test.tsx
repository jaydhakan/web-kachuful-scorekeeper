import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
import { AppProvider } from '@/state/store';
import { FreshPage } from './FreshPage';
// The shell and the pages it opens are lazy chunks; loaded up front so transforming them can't outlast a findBy.
import '@/components/PhoneShell';
import '@/screens/pages/Pages';
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
    await u.click(await screen.findByRole('button', { name: /^Date range/ }));
    await u.click(await screen.findByRole('button', { name: 'Today' }));
    const first = await screen.findByRole('button', { name: /^#1 Asha/ });
    await u.click(first);
    const cards = await screen.findByRole('list', { name: 'Accuracy by cards' });
    // Every bar says how many rounds it stands on.
    expect(within(cards).getAllByText(/^100% · \d+\/\d+$/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Points')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'More stats' }));
    expect(await screen.findByText('Points')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Bids' }));
    expect(await screen.findByRole('list', { name: 'Bids made, by bid' })).toBeInTheDocument();
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
    expect(await screen.findByRole('button', { name: /^Asha/ })).toBeInTheDocument();
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

describe('editing a player from the Players list (signed out)', () => {
  it('renames a local player and sets a first name, and refuses a name that is taken', async () => {
    await seed();
    const u = setup();
    render(<App />);
    await open(u, /Players/);
    await u.click(await screen.findByRole('button', { name: 'Edit Bo' }));
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    const name = await screen.findByLabelText(/Name at the table/);
    await u.clear(name);
    await u.type(name, 'Cy');
    await u.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText(/already has that name/)).toBeTruthy();
    await u.clear(name);
    await u.type(name, 'Bobby');
    await u.type(screen.getByLabelText(/First name/), 'Robert');
    await u.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(archive.all('players').some((p) => p.displayName === 'Bobby')).toBe(true),
    );
    expect(archive.all('players').find((p) => p.displayName === 'Bobby')?.firstName).toBe('Robert');
  });
});

describe('Start fresh (signed out)', () => {
  it('asks first, then clears this device and reloads', async () => {
    await seed();
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const u = setup();
    render(
      <AppProvider>
        <FreshPage />
      </AppProvider>,
    );
    await u.click(await screen.findByRole('button', { name: 'Delete everything' }));
    expect(await screen.findByText('Delete everything and start fresh?')).toBeInTheDocument();
    expect(archive.games().length).toBe(1);
    await u.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
    expect(archive.all('games')).toEqual([]);
    vi.unstubAllGlobals();
  });
});

describe('the menu on Home', () => {
  it('opens from the hamburger and leads to Start fresh', async () => {
    const u = setup();
    render(<App />);
    await u.click((await screen.findAllByRole('button', { name: 'Menu' }))[0]);
    const menu = await screen.findByRole('dialog', { name: 'Menu' });
    expect(within(menu).getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    await u.click(within(menu).getByRole('button', { name: 'Start fresh' }));
    expect(await screen.findByRole('button', { name: 'Delete everything' })).toBeInTheDocument();
  });
});
