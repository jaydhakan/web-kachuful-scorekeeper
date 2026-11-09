import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { archive } from '@/state/archive';
import { KEYS, storage } from '@/state/persistence';
import { curHand } from './select';
import { KtProvider, useKt } from './store';

const wrapper = ({ children }: { children: ReactNode }) => <KtProvider>{children}</KtProvider>;
const NAMES = ['Riya', 'Aarav', 'Kabir', 'Meera'];

function seated() {
  const r = renderHook(() => useKt(), { wrapper });
  act(() => r.result.current.actions.startSetup());
  NAMES.forEach((name, k) =>
    act(() => r.result.current.actions.setupSeat(k, { name, emoji: '🙂', color: '#FF8A65' })),
  );
  return r;
}

describe('KtProvider', () => {
  it('starts empty, then begins a game with registry players, the last group and saved names', async () => {
    await archive.ready;
    const r = seated();
    expect(r.result.current.state).toMatchObject({ game: null, screen: 'setup' });
    act(() => r.result.current.actions.randomDealer());
    expect(r.result.current.state.setup!.dealer).toBeLessThan(4);
    act(() => r.result.current.actions.beginGame());
    const g = r.result.current.state.game!;
    expect(g.players.map((p) => p.name)).toEqual(NAMES);
    expect(g.players.every((p) => archive.get('players', p.playerId!))).toBe(true);
    expect(
      storage
        .get<{ players: { name: string }[] }>(KEYS.ktLastGroup, { players: [] })
        .players.map((p) => p.name),
    ).toEqual(NAMES);
    expect(storage.get<string[]>(KEYS.recentNames, [])).toEqual([...NAMES].reverse());
    expect(storage.get<{ id: string }>(KEYS.ktGame, { id: '' }).id).toBe(g.id);
    expect(storage.get(KEYS.ktScreen, '')).toBe('game');
  });

  it('saves every change, the prefs, and archives the game once a hand is done', async () => {
    await archive.ready;
    const r = seated();
    act(() => r.result.current.actions.beginGame());
    const a = () => r.result.current.actions;
    const ids = r.result.current.state.game!.players.map((p) => p.id);
    act(() => a().setMode('auction'));
    expect(storage.get(KEYS.ktPrefs, {})).toEqual({ quick: false, countedBy: 'defenders' });
    act(() => a().setMode('quick'));
    act(() => a().quickBid(ids[0], 150));
    act(() => a().trump('hearts'));
    act(() => a().addCard({ rank: 'A', suit: 'hearts' }));
    act(() => a().confirmCall());
    act(() => a().markPlayed(0, ids[2]));
    act(() => a().toResult());
    act(() => a().points(60));
    expect(archive.ktGames()).toHaveLength(0);
    act(() => a().confirmHand());
    const g = r.result.current.state.game!;
    expect(curHand(g).phase).toBe('done');
    expect(storage.get<{ rev: number }>(KEYS.ktGame, { rev: 0 }).rev).toBe(g.rev);
    expect(storage.get<string[]>(KEYS.ktUndo, [])).toHaveLength(r.result.current.state.undo.length);
    expect(archive.ktGames().map((x) => x.syncId)).toEqual([g.syncId]);
    expect(archive.games()).toHaveLength(0);
    // Undone to no hand done: the archive copy goes.
    act(() => a().undo());
    expect(archive.ktGames()).toHaveLength(0);
    act(() => a().abandon());
    expect(r.result.current.state.game).toBe(null);
    expect(storage.getRaw(KEYS.ktGame)).toBe(null);
  });

  it('an unreadable save waits for the repair choice', () => {
    storage.setRaw(KEYS.ktGame, '{nope');
    const r = renderHook(() => useKt(), { wrapper });
    expect(r.result.current.state.corrupt).toBe(true);
    expect(storage.getRaw(KEYS.ktGame)).toBe('{nope');
    act(() => r.result.current.actions.repairSave('keep'));
    expect(r.result.current.state).toMatchObject({ corrupt: false, game: null });
    expect(storage.getRaw(KEYS.ktBackup)).toBe('{nope');
  });

  it('throws outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useKt())).toThrow(/KtProvider/);
  });
});
