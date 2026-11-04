import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '@/state/store';
import { archive } from '@/state/archive';
import { KEYS } from '@/state/persistence';
import { ep } from '@/sync/endpoints';
import { AccountPage } from './AccountPage';

const setup = () => userEvent.setup({ pointerEventsCheck: 0 });

async function show() {
  localStorage.setItem(
    KEYS.session,
    JSON.stringify({
      user: { id: 'u1', email: 'me@test.dev', role: 'member', playerId: null },
      player: null,
    }),
  );
  await archive.ready;
  render(
    <AppProvider>
      <AccountPage />
    </AppProvider>,
  );
}

describe('signing out', () => {
  afterEach(() => vi.restoreAllMocks());

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
