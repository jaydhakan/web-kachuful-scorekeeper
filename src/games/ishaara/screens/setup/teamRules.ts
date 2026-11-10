import { MAX_PLAYERS, MIN_TEAM, other, type Seated, type Team } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';

/** The account a seat is linked to, or null: only a linked player can give clues (they open the key signed in). */
export type AccountOf = (p: Seated) => string | null;

export const TEAMS: Team[] = ['sun', 'moon'];

export const onTeam = (players: Seated[], t: Team) => players.filter((p) => p.team === t);

/**
 * One clue-giver per team, and only a linked one: a team keeps its clue-giver while they qualify, otherwise its
 * first linked player takes it; a team with nobody linked has none (setup says so).
 */
export function fixClueGivers(players: Seated[], accountOf: AccountOf): Seated[] {
  const giver: Partial<Record<Team, string>> = {};
  for (const t of TEAMS) {
    const team = onTeam(players, t);
    const kept = team.find((p) => p.role === 'clue-giver' && accountOf(p));
    giver[t] = (kept ?? team.find((p) => accountOf(p)))?.id;
  }
  return players.map((p) => {
    const role = giver[p.team] === p.id ? 'clue-giver' : 'guesser';
    return p.role === role ? p : { ...p, role };
  });
}

/** Moves a player to the other team. */
export const moveSeat = (players: Seated[], id: string, accountOf: AccountOf) =>
  fixClueGivers(
    players.map((p) => (p.id === id ? { ...p, team: other(p.team), role: 'guesser' } : p)),
    accountOf,
  );

/** Makes this player their team's clue-giver, if they are linked. */
export function pickClueGiver(players: Seated[], id: string, accountOf: AccountOf): Seated[] {
  const who = players.find((p) => p.id === id);
  if (!who || !accountOf(who)) return players;
  return players.map((p) =>
    p.team !== who.team ? p : { ...p, role: p.id === id ? 'clue-giver' : 'guesser' },
  );
}

/** The team a new player joins: the smaller one, Sun on a tie. */
export const smallerTeam = (players: Seated[]): Team =>
  onTeam(players, 'moon').length < onTeam(players, 'sun').length ? 'moon' : 'sun';

/** Splits the players into two even teams at random. */
export function shuffleTeams(
  players: Seated[],
  accountOf: AccountOf,
  rnd: () => number = Math.random,
): Seated[] {
  const order = players.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const half = Math.ceil(order.length / 2);
  const team = new Map(order.map((p, i) => [p.id, (i < half ? 'sun' : 'moon') as Team]));
  return fixClueGivers(
    players.map((p) => ({ ...p, team: team.get(p.id)!, role: 'guesser' })),
    accountOf,
  );
}

/** Why the teams can't be used yet, in words for the bar; null when they can. */
export function teamsProblem(players: Seated[], accountOf: AccountOf): string | null {
  if (TEAMS.some((t) => onTeam(players, t).length < MIN_TEAM)) return s.setup.why.fewPlayers;
  if (players.length > MAX_PLAYERS) return s.setup.why.tooMany(MAX_PLAYERS);
  const givers = TEAMS.map((t) =>
    onTeam(players, t).find((p) => p.role === 'clue-giver' && accountOf(p)),
  );
  const missing = TEAMS.find((_, i) => !givers[i]);
  if (missing) return s.setup.why.noClueGiver(missing);
  if (accountOf(givers[0]!) === accountOf(givers[1]!)) return s.setup.why.sameAccount;
  return null;
}
