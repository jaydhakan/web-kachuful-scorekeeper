import { act, render } from '@testing-library/react';
import type { Session } from '@/state/persistence';
import { loadSession } from '@/state/persistence';
import { getSession, resetSessionForTests } from '@/sync/session';
import { AppProvider, useApp, type Actions } from './store';

const asha: Session = {
  user: { id: 'u1', email: 'asha@example.com', role: 'member', playerId: 'p1' },
  player: { id: 'p1', displayName: 'Asha', emoji: '🦉', color: '#60a5fa' },
};

beforeEach(() => resetSessionForTests());

describe('signing in, then leaving for another page at once', () => {
  // Sign-in opened from the landing page or another game returns there in the same tap that signs in, which
  // unmounts Kachuful before an effect could publish the session (the phone's "it refreshed but I'm not signed in").
  it('publishes and saves the session before anything can navigate away', () => {
    let actions: Actions | null = null;
    function Grab() {
      actions = useApp().actions;
      return null;
    }
    const { unmount } = render(
      <AppProvider>
        <Grab />
      </AppProvider>,
    );
    act(() => {
      actions!.setSession(asha);
      unmount();
    });
    expect(getSession()).toEqual(asha);
    expect(loadSession()).toEqual(asha);
  });
});
