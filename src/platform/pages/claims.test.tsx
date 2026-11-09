import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '@/games/kachuful/state/store';
import { ep } from '@/sync/endpoints';
import type { Claim } from '@/sync/types';
import { ClaimsList } from './ClaimsList';

const claim: Claim = {
  id: 'c1',
  gameId: 'g1',
  status: 'pending',
  createdAt: 0,
  player: { id: 'p9', displayName: 'Guest' },
  claimant: { userId: 'u2', playerId: 'p2', displayName: 'Riya' },
};

describe('seat claims on Me', () => {
  afterEach(() => vi.restoreAllMocks());

  it('says who claims which seat, and approving or declining asks the server', async () => {
    const yes = vi.spyOn(ep, 'approveClaim').mockResolvedValue({ ...claim, status: 'approved' });
    const no = vi.spyOn(ep, 'rejectClaim').mockResolvedValue({ ...claim, status: 'rejected' });
    const done = vi.fn();
    render(
      <AppProvider>
        <ClaimsList items={[claim]} onDone={done} />
      </AppProvider>,
    );
    expect(screen.getByText(/Riya says they were “Guest” at your table/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, that’s them' }));
    await waitFor(() => expect(yes).toHaveBeenCalledWith('c1'));
    await userEvent.click(screen.getByRole('button', { name: 'No' }));
    await waitFor(() => expect(no).toHaveBeenCalledWith('c1'));
    expect(done).toHaveBeenCalledTimes(2);
  });
});
