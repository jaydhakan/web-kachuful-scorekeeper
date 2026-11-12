import { useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '@/games/kachuful/state/store';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import { getSession } from '@/sync/session';
import type { PlayerSummary } from '@/sync/types';
import { InvitePage, WELCOME_MS } from './AuthPages';

const player: PlayerSummary = {
  id: 'p1',
  displayName: 'Jay',
  email: 'me@test.dev',
  photoUrl: null,
  firstName: null,
  lastName: null,
  emoji: '🦊',
  color: 'c1',
  createdBy: null,
  linkedUserId: null,
  mergedInto: null,
  createdAt: 0,
  updatedAt: 0,
  games: 3,
  lastPlayedAt: null,
  createdByName: 'Asha',
};
const user = {
  id: 'u1',
  email: 'me@test.dev',
  role: 'member' as const,
  playerId: 'p1',
  createdAt: 0,
};

const seen: { actions?: ReturnType<typeof useApp>['actions'] } = {};
function Probe() {
  const { actions } = useApp();
  useEffect(() => {
    seen.actions = actions;
  }, [actions]);
  return null;
}

/** The invite page for an invite that offers `player`, with both passwords typed. */
async function ready() {
  vi.spyOn(ep, 'invite').mockResolvedValue({ email: 'me@test.dev', player });
  const view = render(
    <AppProvider>
      <Probe />
      <InvitePage token="tok" />
    </AppProvider>,
  );
  await screen.findByText('Jay');
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'abc' } });
  fireEvent.change(screen.getByLabelText('Password again'), { target: { value: 'abc' } });
  const reset = vi.spyOn(seen.actions!, 'navReset');
  return {
    view,
    reset,
    submit: () => fireEvent.click(screen.getByRole('button', { name: 'Set password and start' })),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('accepting an invite', () => {
  it('signs in, shows the welcome, then goes Home by itself, once', async () => {
    const { view, reset, submit } = await ready();
    vi.spyOn(ep, 'acceptInvite').mockResolvedValue({ user, player });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    submit();
    expect(await screen.findByRole('heading', { name: "You're in" })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent("You're inA seat is yours, Jay.");
    expect(getSession()?.player?.id).toBe('p1');
    expect(reset).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(WELCOME_MS));
    expect(reset).toHaveBeenCalledTimes(1);
    view.unmount();
    act(() => void vi.advanceTimersByTime(50));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it.each(['click', 'Enter', 'Escape'])('%s moves on at once', async (how) => {
    const { reset, submit } = await ready();
    vi.spyOn(ep, 'acceptInvite').mockResolvedValue({ user, player });
    submit();
    const skip = await screen.findByRole('button', { name: 'Continue' });
    expect(skip).toHaveFocus();
    if (how === 'click') fireEvent.click(skip);
    else fireEvent.keyDown(skip, { key: how });
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('leaving during the welcome still goes Home, once', async () => {
    const { view, reset, submit } = await ready();
    vi.spyOn(ep, 'acceptInvite').mockResolvedValue({ user, player });
    submit();
    await screen.findByRole('heading', { name: "You're in" });
    view.unmount();
    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
  });

  it('a failed accept keeps the form and says why', async () => {
    const { reset, submit } = await ready();
    vi.spyOn(ep, 'acceptInvite').mockRejectedValue(new ApiError(500, 'server', {}));
    submit();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: "You're in" })).toBeNull();
    expect(reset).not.toHaveBeenCalled();
  });
});
