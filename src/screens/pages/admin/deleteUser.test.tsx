import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ep } from '@/sync/endpoints';
import { DeleteUser } from './DeleteUser';

const preview = {
  games: 2,
  rounds: 5,
  otherPlayers: 3,
  sessions: 1,
  invites: 0,
  hasPhoto: true,
  playerInOthersGames: true,
};

describe('deleting an account in Admin', () => {
  afterEach(() => vi.restoreAllMocks());

  it('says what goes and what stays, and waits for the email before deleting', async () => {
    vi.spyOn(ep, 'deletionPreview').mockResolvedValue(preview);
    const del = vi.spyOn(ep, 'deleteUser').mockResolvedValue(undefined);
    const done = vi.fn();
    const u = userEvent.setup();
    render(
      <DeleteUser
        kind="account"
        userId="u1"
        email="riya@example.com"
        onClose={() => {}}
        onDone={done}
      />,
    );
    expect(await screen.findByText(/2 games they scored \(5 rounds\)/)).toBeInTheDocument();
    expect(
      screen.getByText('3 other players lose the rounds from those games'),
    ).toBeInTheDocument();
    expect(screen.getByText(/shown as “Deleted player”/)).toBeInTheDocument();
    expect(screen.queryByText('Their player')).toBeNull();
    const go = screen.getByRole('button', { name: 'Delete account' });
    expect(go).toBeDisabled();
    await u.type(screen.getByLabelText('Email, to confirm'), 'riya@example.co');
    expect(go).toBeDisabled();
    await u.type(screen.getByLabelText('Email, to confirm'), 'm');
    await u.click(go);
    await waitFor(() => expect(done).toHaveBeenCalledWith('riya@example.com was deleted'));
    expect(del).toHaveBeenCalledWith('u1');
  });

  it('clearing games keeps the account, and says how many went', async () => {
    vi.spyOn(ep, 'deletionPreview').mockResolvedValue({ ...preview, playerInOthersGames: false });
    vi.spyOn(ep, 'clearUserGames').mockResolvedValue({ games: 2 });
    const done = vi.fn();
    const u = userEvent.setup();
    render(
      <DeleteUser
        kind="games"
        userId="u1"
        email="riya@example.com"
        onClose={() => {}}
        onDone={done}
      />,
    );
    expect(await screen.findByText('Their account and players')).toBeInTheDocument();
    expect(screen.queryByText('Their account, email, password and settings')).toBeNull();
    await u.type(screen.getByLabelText('Email, to confirm'), 'RIYA@example.com');
    await u.click(screen.getByRole('button', { name: 'Delete their games' }));
    await waitFor(() => expect(done).toHaveBeenCalledWith('2 games deleted'));
  });
});
