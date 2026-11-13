import type { Earned, Player } from '@/games/kachuful/domain';
import { howWon } from './howWon';

const p = (name: string): Player => ({ id: name, name, emoji: '🐯', color: 'var(--tx)' }) as Player;
const got = (name: string, code: string, data: Record<string, unknown> = {}) => ({
  e: {
    code,
    playerId: `name:${name.toLowerCase()}`,
    gameId: 'g1',
    roundIndex: null,
    period: null,
    earnedAt: 1,
    data,
  } satisfies Earned,
  who: { name },
});

describe('howWon', () => {
  it('says the rarest thing: a comeback beats a photo finish', () => {
    const earned = [got('Riya', 'photo_finish', { by: 4 }), got('Riya', 'comeback')];
    expect(howWon(earned, [p('Riya')])).toBe('from last place');
  });

  it('follows the order comeback, perfect, wire to wire, photo finish, first win', () => {
    const all = ['first_win', 'photo_finish', 'wire_to_wire', 'perfect_game', 'comeback'].map((c) =>
      got('Riya', c, { by: 10 }),
    );
    const said = all.map((_, k) => howWon(all.slice(0, k + 1), [p('Riya')]));
    expect(said).toEqual([
      'first win',
      'by 10 points',
      'led from the first round',
      'every bid made',
      'from last place',
    ]);
  });

  it('says nothing for a shared win, an ordinary win, or what someone else earned', () => {
    const earned = [got('Riya', 'comeback'), got('Dev', 'perfect_game')];
    expect(howWon(earned, [p('Riya'), p('Meera')])).toBeNull();
    expect(howWon([got('Riya', 'winner')], [p('Riya')])).toBeNull();
    expect(howWon(earned, [p('Meera')])).toBeNull();
  });
});
