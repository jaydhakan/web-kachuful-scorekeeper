import { archive } from '@/state/archive';
import { allSync, GAMES } from './catalog';
import { dismiss, say } from './notice';
import { clearUnknown, go, guessGame, startRoute, unknownAddress } from './route';

describe('unknown addresses (PL-F11)', () => {
  it('guesses the game a mistyped path meant, ignoring case and dashes', () => {
    expect(guessGame('/kali-teeri')).toBe('kaali-teeri');
    expect(guessGame('/KACHUFUL-')).toBe('kachuful');
    expect(guessGame('/ishara')).toBe('ishaara');
    expect(guessGame('/kaaliteeri/x')).toBe('kaali-teeri');
  });

  it('guesses nothing for a path like no game', () => {
    expect(guessGame('/poker')).toBeNull();
    expect(guessGame('/')).toBeNull();
  });

  it('remembers the unknown address it started on until the visitor moves on', () => {
    history.replaceState(null, '', '/kali-teeri?x=1');
    startRoute();
    expect(location.pathname + location.search).toBe('/?x=1');
    expect(unknownAddress()).toEqual({ path: '/kali-teeri', guess: 'kaali-teeri' });
    go('kachuful');
    expect(unknownAddress()).toBeNull();
  });

  it('a known address or an old link is not unknown', () => {
    for (const [path, search] of [
      ['/kachuful', ''],
      ['/', '?live=abc'],
      ['/Kaali-Teeri/', ''],
    ]) {
      clearUnknown();
      history.replaceState(null, '', path + search);
      startRoute();
      expect(unknownAddress()).toBeNull();
    }
  });
});

describe('the platform notice slot (PL-F12)', () => {
  afterEach(() => vi.useRealTimers());

  it('shows one notice at a time; Undo stays 8s, a plain notice 4s', async () => {
    vi.useFakeTimers();
    const { useNotice } = await import('./notice');
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => useNotice());
    act(() => say('Applied', { action: { label: 'Undo', run: () => {} } }));
    expect(result.current?.msg).toBe('Applied');
    act(() => vi.advanceTimersByTime(7900));
    expect(result.current?.msg).toBe('Applied');
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBeNull();
    act(() => say('Ready offline'));
    act(() => vi.advanceTimersByTime(4100));
    expect(result.current).toBeNull();
  });

  it('an old timer never clears a newer notice', async () => {
    const { useNotice } = await import('./notice');
    const { renderHook, act } = await import('@testing-library/react');
    const { result } = renderHook(() => useNotice());
    act(() => say('first'));
    const first = result.current!.id;
    act(() => say('second'));
    act(() => dismiss(first));
    expect(result.current?.msg).toBe('second');
    act(() => dismiss());
  });
});

describe('every game’s sync, for Me and signing out (PL-F12)', () => {
  it('each game scored on this device has a sync entry; the server’s game has none', () => {
    expect(GAMES.filter((g) => g.sync).map((g) => g.id)).toEqual(['kachuful', 'kaali-teeri']);
  });

  it('counts pending games across games, not only Kachuful', async () => {
    const s = await allSync();
    expect(s.pending('u1')).toBe(0);
    expect(archive.all('games')).toEqual([]);
    await expect(s.syncNow()).resolves.toBeUndefined();
  });
});
