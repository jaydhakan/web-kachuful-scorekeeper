import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { AppProvider } from '@/games/kachuful/state/store';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import type { Claim } from '@/sync/types';
import { InvitePage, ResetPage } from './AuthPages';
import { ClaimsList } from './ClaimsList';

// PL-F11: a used or expired link offers a next step, and an offline one a retry. PL-F12: a failed admin action
// shows beside the button, not in a passing toast.

afterEach(() => vi.restoreAllMocks());

describe('links that cannot be used', () => {
  it('a used invite offers Sign in and All games', async () => {
    vi.spyOn(ep, 'invite').mockRejectedValue(new ApiError(410, 'gone'));
    render(
      <AppProvider>
        <InvitePage token="t" />
      </AppProvider>,
    );
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All games' })).toBeInTheDocument();
    expect(screen.getByText(/Already set up\? Sign in/)).toBeInTheDocument();
  });

  it('an invite checked while offline offers Try again, which checks once more', async () => {
    const check = vi
      .spyOn(ep, 'invite')
      .mockRejectedValueOnce(new ApiError(0, 'offline'))
      .mockResolvedValue({ email: 'me@test.dev', player: null });
    render(
      <AppProvider>
        <InvitePage token="t" />
      </AppProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(check).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('a used reset link offers Sign in', async () => {
    vi.spyOn(ep, 'reset').mockRejectedValue(new ApiError(410, 'gone'));
    render(
      <AppProvider>
        <ResetPage token="t" />
      </AppProvider>,
    );
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('admin failures', () => {
  it('a claim that fails to approve says why on its own row', async () => {
    vi.spyOn(ep, 'approveClaim').mockRejectedValue(new ApiError(500, 'server'));
    const claim = {
      id: 'c1',
      claimant: { displayName: 'Riya' },
      player: { displayName: 'Ri' },
    } as unknown as Claim;
    render(
      <AppProvider>
        <ClaimsList items={[claim]} onDone={() => {}} />
      </AppProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Yes, that’s them' }));
    const row = screen.getByRole('listitem');
    expect(await within(row).findByRole('alert')).toHaveTextContent(/went wrong/);
  });
});
