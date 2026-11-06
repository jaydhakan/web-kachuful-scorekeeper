import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import { ReactionBar, WatchersPill } from './LiveReactions';

describe('spectator reactions', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends a cheer and says so', async () => {
    const react = vi.spyOn(ep, 'react').mockResolvedValue(undefined);
    render(<ReactionBar token="tok" onOff={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Party' }));
    expect(react).toHaveBeenCalledWith('tok', 'party');
    expect(await screen.findByText('Party sent')).toBeInTheDocument();
  });

  it('asks to slow down on a 429, and hides itself once reactions are off', async () => {
    const onOff = vi.fn();
    vi.spyOn(ep, 'react').mockRejectedValueOnce(new ApiError(429, 'rate_limited'));
    const { unmount } = render(<ReactionBar token="tok" onOff={onOff} />);
    await userEvent.click(screen.getByRole('button', { name: 'Clap' }));
    expect(await screen.findByText('Easy there, one at a time')).toBeInTheDocument();
    unmount();
    vi.spyOn(ep, 'react').mockRejectedValueOnce(new ApiError(409, 'reactions_off'));
    render(<ReactionBar token="tok" onOff={onOff} />);
    await userEvent.click(screen.getByRole('button', { name: 'Wow' }));
    await waitFor(() => expect(onOff).toHaveBeenCalled());
  });

  it('shows the watcher count only when someone watches', () => {
    const { rerender } = render(<WatchersPill n={0} />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<WatchersPill n={3} />);
    expect(screen.getByRole('status')).toHaveTextContent('3 watching');
  });
});
