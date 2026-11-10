import type { Seated } from '@/games/ishaara/domain';
import {
  fixClueGivers,
  moveSeat,
  pickClueGiver,
  shuffleTeams,
  smallerTeam,
  teamsProblem,
  type AccountOf,
} from './teamRules';

const seat = (id: string, team: Seated['team'], role: Seated['role'] = 'guesser'): Seated => ({
  id,
  name: id,
  emoji: '🙂',
  color: 'c',
  playerId: `p-${id}`,
  team,
  role,
});
// Riya, Dev and Jay have accounts (Riya and Jay the same one); Aarav and Meera don't.
const ACC: Record<string, string> = { riya: 'u1', dev: 'u2', jay: 'u1' };
const accountOf: AccountOf = (p) => ACC[p.id] ?? null;

const TABLE = [
  seat('riya', 'sun', 'clue-giver'),
  seat('aarav', 'sun'),
  seat('dev', 'moon', 'clue-giver'),
  seat('meera', 'moon'),
];

describe('setup teams', () => {
  it('accepts two teams of two with two different linked clue-givers', () => {
    expect(teamsProblem(TABLE, accountOf)).toBeNull();
  });

  it('needs two players a team', () => {
    expect(teamsProblem(TABLE.slice(0, 3), accountOf)).toBe('Each team needs at least 2 players.');
    expect(teamsProblem(moveSeat(TABLE, 'aarav', accountOf), accountOf)).toBe(
      'Each team needs at least 2 players.',
    );
  });

  it('needs a signed-in clue-giver on each team, and two different people', () => {
    const noMoonGiver = TABLE.map((p) => (p.id === 'dev' ? { ...p, role: 'guesser' as const } : p));
    expect(teamsProblem(noMoonGiver, accountOf)).toMatch(/^Moon needs a clue-giver/);
    const same = [
      ...TABLE.filter((p) => p.id !== 'dev'),
      seat('jay', 'moon', 'clue-giver'),
      seat('x', 'moon'),
    ];
    expect(teamsProblem(same, accountOf)).toBe('The two clue-givers must be different people.');
  });

  it('gives each team its first linked player when its clue-giver leaves or can’t give clues', () => {
    const moved = moveSeat(TABLE, 'riya', accountOf);
    expect(moved.find((p) => p.id === 'riya')).toMatchObject({ team: 'moon', role: 'guesser' });
    // Sun has nobody linked left, so no clue-giver.
    expect(moved.filter((p) => p.team === 'sun' && p.role === 'clue-giver')).toEqual([]);
    const back = moveSeat(moved, 'riya', accountOf);
    expect(back.find((p) => p.id === 'riya')?.role).toBe('clue-giver');
    const fixed = fixClueGivers(
      [seat('aarav', 'sun', 'clue-giver'), seat('riya', 'sun')],
      accountOf,
    );
    expect(fixed.map((p) => p.role)).toEqual(['guesser', 'clue-giver']);
  });

  it('only lets a linked player be picked as clue-giver', () => {
    expect(pickClueGiver(TABLE, 'aarav', accountOf)).toBe(TABLE);
    const two = [...TABLE, seat('jay', 'sun')];
    const picked = pickClueGiver(two, 'jay', accountOf);
    expect(
      picked.filter((p) => p.team === 'sun' && p.role === 'clue-giver').map((p) => p.id),
    ).toEqual(['jay']);
  });

  it('adds to the smaller team and shuffles into even teams', () => {
    expect(smallerTeam(TABLE.slice(0, 3))).toBe('moon');
    expect(smallerTeam(TABLE)).toBe('sun');
    const shuffled = shuffleTeams([...TABLE, seat('kabir', 'sun')], accountOf, () => 0.3);
    expect(shuffled.filter((p) => p.team === 'sun')).toHaveLength(3);
    expect(shuffled.filter((p) => p.team === 'moon')).toHaveLength(2);
    for (const t of ['sun', 'moon'] as const)
      expect(
        shuffled.filter((p) => p.team === t && p.role === 'clue-giver').length,
      ).toBeLessThanOrEqual(1);
  });
});
