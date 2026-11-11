import { KEYS, storage } from '@/state/persistence';
import { demoGame } from '@/games/kachuful/domain';
import fixture from './__fixtures__/prototype-save.json';
import { peek } from './peek';

describe('Kachuful peek', () => {
  it('is null with nothing saved, for the demo, and for a finished game', () => {
    expect(peek()).toBeNull();
    storage.set(KEYS.game, demoGame());
    expect(peek()).toBeNull();
    storage.set(KEYS.game, { ...demoGame(), id: 'g1', status: 'finished' });
    expect(peek()).toBeNull();
  });

  it('names the round, its cards and the dealer', () => {
    const g = { ...demoGame(), id: 'g1' };
    storage.set(KEYS.game, g);
    const r = g.rounds.at(-1)!;
    const p = peek();
    expect(p?.line).toBe(
      `Round ${r.index + 1} · ${r.cards} ${r.cards === 1 ? 'card' : 'cards'} · ${g.players[r.dealerIndex].name} deals`,
    );
    expect(p?.updatedAt).toBe(g.updatedAt);
  });

  it('reads a prototype save, or gives no line for one it cannot read', () => {
    storage.set(KEYS.game, fixture);
    const p = peek();
    expect(p === null || /^Round \d+/.test(p.line)).toBe(true);
    storage.setRaw(KEYS.game, '{not json');
    expect(peek()).toBeNull();
  });

  it('leaves out the dealer when the seat is missing', () => {
    const g = { ...demoGame(), id: 'g1' };
    g.rounds = [{ ...g.rounds.at(-1)!, dealerIndex: 99 }];
    storage.set(KEYS.game, g);
    expect(peek()?.line).toMatch(/^Round \d+ · \d+ cards?$/);
  });
});
