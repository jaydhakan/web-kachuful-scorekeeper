import { applyAction, join, newGame } from '../rules';
import { dealKey } from '../deal';
import type {
  Action,
  Actor,
  ClueNumber,
  Identity,
  IshaaraPublic,
  IshaaraRules,
  Seated,
  Team,
} from '../types';

export const T0 = Date.UTC(2026, 10, 1, 13, 30);

export const WORDS = [
  'river',
  'kite',
  'train',
  'cricket',
  'mango',
  'bridge',
  'mirror',
  'ghost',
  'wedding',
  'rocket',
  'temple',
  'pepper',
  'lion',
  'ocean',
  'film',
  'market',
  'needle',
  'crown',
  'shadow',
  'clock',
  'garden',
  'dosa',
  'thunder',
  'pilot',
  'chai',
];

const seat = (n: string, team: Team, role: Seated['role']): Seated => ({
  id: `s-${n}`,
  name: n[0].toUpperCase() + n.slice(1),
  emoji: '🙂',
  color: '#f5a524',
  playerId: `00000000-0000-4000-8000-0000000000${String(n.charCodeAt(0)).padStart(2, '0')}`,
  team,
  role,
});

export const PLAYERS: Seated[] = [
  seat('riya', 'sun', 'clue-giver'),
  seat('arjun', 'sun', 'guesser'),
  seat('dev', 'moon', 'clue-giver'),
  seat('meera', 'moon', 'guesser'),
];

export const RULES: IshaaraRules = {
  timerSec: null,
  clueEntry: 'typed',
  packs: ['everyday'],
  bestOf: 1,
};

export const TABLE: Actor = { kind: 'table' };
export const giver = (team: Team): Actor => ({ kind: 'clue-giver', team });

/** A fixed key: cards 0–8 the starting team's, 9–16 the other's, 17–23 blank, 24 the trap. */
export function plainKey(starting: Team): Identity[] {
  const second: Team = starting === 'sun' ? 'moon' : 'sun';
  return [...Array(9).fill(starting), ...Array(8).fill(second), ...Array(7).fill('blank'), 'trap'];
}

export interface Kit {
  state: IshaaraPublic;
  key: Identity[];
  now: number;
}

/** An active game (both clue-givers joined) with a known key. */
export function started(
  o: { starting?: Team; rules?: Partial<IshaaraRules>; key?: Identity[]; seed?: number } = {},
): Kit {
  const dealt = o.seed !== undefined ? dealKey(o.seed) : null;
  const starting = dealt?.starting ?? o.starting ?? 'sun';
  const key = dealt?.key ?? o.key ?? plainKey(starting);
  let state = newGame({
    id: '50000000-0000-4000-8000-000000000001',
    players: PLAYERS,
    words: WORDS,
    rules: { ...RULES, ...o.rules },
    starting,
    now: T0,
  });
  state = join(state, 'sun', T0 + 1000);
  state = join(state, 'moon', T0 + 2000);
  return { state, key, now: T0 + 3000 };
}

/** Applies an action that must succeed, moving the clock on 1 s first. */
export function act(k: Kit, actor: Actor, action: Action, dt = 1000): Kit {
  const now = k.now + dt;
  const r = applyAction(k.state, k.key, action, actor, now);
  if (!r.ok) throw new Error(`${action.type} failed: ${JSON.stringify(r.error)}`);
  return { ...k, state: r.state, now };
}

/** Applies an action that must fail; returns the error. */
export function fail(k: Kit, actor: Actor, action: Action, dt = 1000) {
  const r = applyAction(k.state, k.key, action, actor, k.now + dt);
  if (r.ok) throw new Error(`${action.type} should have failed`);
  return r.error;
}

export const clue = (k: Kit, word: string | null, number: ClueNumber, dt?: number) =>
  act(k, giver(k.state.turn), { type: 'clue', word, number }, dt);
export const pick = (k: Kit, card: number, dt?: number) =>
  act(k, TABLE, { type: 'guess', card }, dt);
