import { act, renderHook } from '@testing-library/react';
import { currentGame, entryPath, gameFromPath, go, pathOf, startRoute, useGame } from './route';

describe('gameFromPath', () => {
  it('reads the first segment, tolerating case and slashes', () => {
    expect(gameFromPath('/kachuful')).toBe('kachuful');
    expect(gameFromPath('/Kaali-Teeri/')).toBe('kaali-teeri');
    expect(gameFromPath('//ishaara/x')).toBe('ishaara');
  });
  it('is null for the landing page and unknown paths', () => {
    expect(gameFromPath('/')).toBeNull();
    expect(gameFromPath('')).toBeNull();
    expect(gameFromPath('/poker')).toBeNull();
  });
  it('round-trips with pathOf', () => {
    expect(pathOf('kachuful')).toBe('/kachuful');
    expect(pathOf(null)).toBe('/');
  });
});

describe('entryPath', () => {
  it('leaves a clean address alone', () => {
    expect(entryPath('/', '')).toBeNull();
    expect(entryPath('/kachuful', '?live=x')).toBeNull();
  });
  it('sends the old links on / to Kachuful, query kept', () => {
    for (const k of ['live', 'recap', 'invite', 'reset'])
      expect(entryPath('/', `?${k}=tok`)).toBe(`/kachuful?${k}=tok`);
  });
  it('tidies a game path and drops an unknown one', () => {
    expect(entryPath('/Kachuful/', '?a=1')).toBe('/kachuful?a=1');
    expect(entryPath('/nope', '')).toBe('/');
    expect(entryPath('/nope', '?q=1')).toBe('/?q=1');
  });
});

describe('go and system Back', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/');
    startRoute();
  });

  it('pushes the game path and Back returns to the landing page', async () => {
    const { result } = renderHook(() => useGame());
    expect(result.current).toBeNull();
    act(() => go('kaali-teeri'));
    expect(location.pathname).toBe('/kaali-teeri');
    expect(result.current).toBe('kaali-teeri');
    await act(async () => {
      history.back();
      await new Promise((r) => window.addEventListener('popstate', r, { once: true }));
    });
    expect(result.current).toBeNull();
  });

  it("drops a game's open sheet entries before leaving", async () => {
    act(() => go('kachuful'));
    history.pushState({ kf: 1 }, '');
    await act(async () => {
      go(null);
      await new Promise((r) => window.addEventListener('popstate', r, { once: true }));
    });
    expect(location.pathname).toBe('/');
    expect(currentGame()).toBeNull();
    expect(history.state).toBeNull();
  });

  it('startRoute tidies the address at boot', () => {
    history.replaceState(null, '', '/?recap=abc');
    startRoute();
    expect(location.pathname + location.search).toBe('/kachuful?recap=abc');
    expect(currentGame()).toBe('kachuful');
  });
});
