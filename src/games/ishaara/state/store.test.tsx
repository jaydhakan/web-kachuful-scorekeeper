import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { started } from '@/games/ishaara/domain/__fixtures__/kit';
import { loadIshLastSetup, loadRecentWords } from '@/games/ishaara/state/persistence';
import { IshaaraProvider, navReducer, initialNav, useIshaara } from './store';

const G = started().state;
const wrap = ({ children }: { children: ReactNode }) => (
  <IshaaraProvider>{children}</IshaaraProvider>
);
afterEach(() => vi.unstubAllGlobals());

describe('Ishaara nav', () => {
  it('moves the table with the game’s status; a clue phone stays on its key', () => {
    let s = navReducer(initialNav, { type: 'open', id: 'g', role: 'table' });
    expect(s).toEqual({ screen: 'waiting', gameId: 'g', role: 'table' });
    s = navReducer(s, { type: 'track', status: 'active' });
    expect(s.screen).toBe('board');
    s = navReducer(s, { type: 'track', status: 'finished' });
    expect(s.screen).toBe('win');
    expect(navReducer(s, { type: 'leave' })).toEqual({
      screen: 'home',
      gameId: null,
      role: 'table',
    });
    const clue = navReducer(initialNav, { type: 'open', id: 'g', role: 'clue' });
    expect(navReducer(clue, { type: 'track', status: 'finished' }).screen).toBe('key');
    expect(navReducer(clue, { type: 'leave' }).screen).toBe('clue-list');
  });

  it('startGame creates on the server, reuses the id after a lost answer, and remembers the setup', async () => {
    const bodies: { id: string }[] = [];
    let n = 0;
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(init.body as string) as { id: string });
      if (n++ === 0) throw new TypeError('network');
      return new Response(
        JSON.stringify({
          game: { ...G, id: bodies.at(-1)!.id, status: 'waiting' },
          me: { host: true, team: null },
          serverNow: 1,
        }),
        { status: 201 },
      );
    });
    const { result } = renderHook(() => useIshaara(), { wrapper: wrap });
    const input = { players: G.players, words: G.words, rules: G.rules, customWords: ['Bhindi'] };
    let r = await act(() => result.current.actions.startGame(input));
    expect(r).toMatchObject({ ok: false, error: { offline: true } });
    expect(result.current.nav.screen).toBe('home');
    r = await act(() => result.current.actions.startGame(input));
    expect(r.ok).toBe(true);
    expect(bodies[0].id).toBe(bodies[1].id);
    expect(result.current.nav).toEqual({ screen: 'waiting', gameId: bodies[1].id, role: 'table' });
    expect(loadRecentWords().slice(0, 25)).toEqual(G.words);
    expect(loadIshLastSetup()).toMatchObject({ customWords: ['Bhindi'], packs: G.rules.packs });
  });
});
