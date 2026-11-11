import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '@/games/kachuful/state/store';
import { archive } from '@/state/archive';
import { recFromServer } from '@/state/registry';
import { KEYS } from '@/state/persistence';
import { ep } from '@/sync/endpoints';
import type { Player } from '@/sync/types';
import { AccountPage } from './AccountPage';

const setup = () => userEvent.setup({ pointerEventsCheck: 0 });
const PHOTO = '/api/players/p1/photo?v=2';
const player: Player = {
  id: 'p1',
  displayName: 'Jay',
  email: 'me@test.dev',
  photoUrl: PHOTO,
  firstName: 'Jay',
  lastName: 'Dhakan',
  emoji: '🦊',
  color: 'c1',
  createdBy: null,
  linkedUserId: 'u1',
  mergedInto: null,
  createdAt: 0,
  updatedAt: 0,
};

const profile = (rank: number | null) =>
  ({
    player: { ...player, games: 14, lastPlayedAt: null, createdByName: 'Jay' },
    totals: { games: 14 },
    achievements: [
      { id: 'a1', code: 'first_game', playerId: 'p1' },
      { id: 'a2', code: 'first_game', playerId: 'p1' },
      { id: 'a3', code: 'first_win', playerId: 'p1' },
    ],
    rank: { global: rank, outOf: 9 },
  }) as unknown as Awaited<ReturnType<typeof ep.player>>;

async function show(withPlayer = false) {
  localStorage.setItem(
    KEYS.session,
    JSON.stringify({
      user: { id: 'u1', email: 'me@test.dev', role: 'member', playerId: withPlayer ? 'p1' : null },
      player: withPlayer ? player : null,
    }),
  );
  await archive.ready;
  if (withPlayer) archive.put('players', recFromServer(player));
  render(
    <AppProvider>
      <AccountPage />
    </AppProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('the Me screen', () => {
  it('shows my photo large, my email once, and where I stand', async () => {
    vi.spyOn(ep, 'player').mockResolvedValue(profile(1));
    await show(true);
    expect(screen.getByRole('heading', { name: 'Me' })).toBeInTheDocument();
    const hero = screen.getByRole('button', { name: /Photo of Jay/ });
    expect(hero.querySelector(`img[src="${PHOTO}"]`)).not.toBeNull();
    expect(screen.getAllByText(/me@test\.dev/)).toHaveLength(1);
    expect(screen.getByText('Jay Dhakan · me@test.dev')).toBeInTheDocument();
    const rank = await screen.findByRole('button', { name: /Rank/ });
    expect(rank).toHaveTextContent('#1');
    expect(rank).toHaveTextContent('of 9');
    expect(screen.getByRole('button', { name: /Games/ })).toHaveTextContent('14');
    // Two of one code count once.
    expect(screen.getByRole('button', { name: /Achievements/ })).toHaveTextContent(/^2/);
  });

  it('says so when I am not ranked yet', async () => {
    vi.spyOn(ep, 'player').mockResolvedValue(profile(null));
    await show(true);
    expect(await screen.findByRole('button', { name: /Rank/ })).toHaveTextContent('Not ranked');
  });

  it('hides Needs you while nothing needs me, and counts it when something does', async () => {
    await show();
    expect(screen.queryByText(/Needs you/)).not.toBeInTheDocument();
    archive.put('inbox', {
      id: 'i1',
      kind: 'conflict',
      createdAt: 1,
      key: 'g1',
      data: { copy: 'g1' },
    });
    expect(await screen.findByText('Needs you (1)')).toBeInTheDocument();
    archive.del('inbox', 'i1');
  });

  it('changes the password in a sheet', async () => {
    const change = vi.spyOn(ep, 'changePassword').mockResolvedValue(undefined as never);
    await show();
    const u = setup();
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Change password' }));
    const sheet = screen.getByRole('dialog', { name: 'Change password' });
    await u.type(within(sheet).getByLabelText('Current password'), 'old-one');
    await u.type(within(sheet).getByLabelText('New password'), 'new-one-2');
    await u.click(within(sheet).getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(change).toHaveBeenCalledWith('old-one', 'new-one-2'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('signing out', () => {
  it('asks once, and Cancel really cancels', async () => {
    const out = vi.spyOn(ep, 'logout').mockResolvedValue(undefined as never);
    await show();
    const u = setup();
    await u.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Sign out of me@test.dev?');
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(out).not.toHaveBeenCalled();
  });

  it('removes the synced games without asking again', async () => {
    const out = vi.spyOn(ep, 'logout').mockResolvedValue(undefined as never);
    await show();
    const u = setup();
    await u.click(await screen.findByRole('button', { name: 'Sign out' }));
    await u.click(screen.getByRole('button', { name: 'Remove synced games' }));
    await waitFor(() => expect(out).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
