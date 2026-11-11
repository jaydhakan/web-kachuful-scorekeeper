import { act, renderHook } from '@testing-library/react';
import { KEYS, storage, type Session } from '@/state/persistence';
import { getSession, resetSessionForTests, setSession, signedInAs, useSession } from './session';

const s: Session = {
  user: { id: 'u1', email: 'a@b.c', role: 'member', playerId: null },
  player: null,
};

describe('shared session', () => {
  it('reads the saved session once and saves each change', () => {
    storage.set(KEYS.session, s);
    resetSessionForTests();
    expect(getSession()?.user.id).toBe('u1');
    setSession(null);
    expect(storage.get(KEYS.session, 'gone')).toBe('gone');
  });

  it('tells subscribers, and a stale session is not signed in', () => {
    const { result } = renderHook(() => useSession());
    expect(result.current).toBeNull();
    act(() => setSession(s));
    expect(result.current?.user.id).toBe('u1');
    expect(signedInAs()).toBe(s);
    act(() => setSession({ ...s, stale: true }));
    expect(signedInAs()).toBeNull();
  });
});
