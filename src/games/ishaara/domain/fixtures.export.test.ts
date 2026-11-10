import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { seeded, dealKey } from './deal';
import { applyAction, join, newGame } from './rules';
import { playerRows, revealedCount } from './stats';
import { PLAYERS, RULES, T0, WORDS, giver, plainKey } from './__fixtures__/kit';
import type { Action, Actor, Identity, IshaaraPublic, IshaaraRules, Team } from './types';

/**
 * Ishaara's golden fixtures for the backend (contract/README.md): a game replayed step by step, each step's result,
 * the final public state and the derived rows. `EXPORT_FIXTURES=1 npx vitest run
 * src/games/ishaara/domain/fixtures.export.test.ts` rewrites contract/fixtures/ishaara-*.json.
 */
const DIR = path.resolve(import.meta.dirname, '../../../../contract/fixtures');

type Step = { at: number; join: Team } | { at: number; actor: Actor; action: Action };
const T = (k: number) => T0 + k * 1000;
const tbl: Actor = { kind: 'table' };
const sun = giver('sun');
const moon = giver('moon');
const joins: Step[] = [
  { at: T(1), join: 'sun' },
  { at: T(2), join: 'moon' },
];
const s = (at: number, actor: Actor, action: Action): Step => ({ at: T(at), actor, action });
const g = (at: number, card: number) => s(at, tbl, { type: 'guess', card });
const c = (at: number, actor: Actor, word: string | null, number: number | 'inf') =>
  s(at, actor, { type: 'clue', word, number });

interface Scenario {
  name: string;
  starting: Team;
  key: Identity[];
  rules?: Partial<IshaaraRules>;
  steps: Step[];
}

function replay(sc: Scenario) {
  const rules = { ...RULES, ...sc.rules };
  let state: IshaaraPublic = newGame({
    id: `60000000-0000-4000-8000-${sc.name.length.toString().padStart(12, '0')}`,
    players: PLAYERS,
    words: WORDS,
    rules,
    starting: sc.starting,
    now: T0,
  });
  const results = sc.steps.map((st) => {
    if ('join' in st) {
      state = join(state, st.join, st.at);
      return { ok: true };
    }
    const r = applyAction(state, sc.key, st.action, st.actor, st.at);
    state = r.state;
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  });
  return {
    kind: 'ishaara',
    name: sc.name,
    setup: {
      id: state.id,
      players: PLAYERS,
      words: WORDS,
      rules,
      starting: sc.starting,
      key: sc.key,
      createdAt: T0,
    },
    steps: sc.steps.map((st, i) => ({ ...st, expect: results[i] })),
    expect: {
      state,
      rows: state.status === 'finished' ? playerRows(state) : null,
      revealedCount: revealedCount(state),
    },
  };
}

/** Mostly sensible play with some wrong moves, simulated so the steps follow the game; ends when it ends. */
function randomGame(seed: number): Scenario {
  const { key, starting } = dealKey(seed);
  const rnd = seeded(seed);
  const steps: Step[] = [...joins];
  let state = join(
    join(
      newGame({
        id: 'x',
        players: PLAYERS,
        words: WORDS,
        rules: { ...RULES, timerSec: 60 },
        starting,
        now: T0,
      }),
      'sun',
      T(1),
    ),
    'moon',
    T(2),
  );
  let t = T(3);
  const faceDown = () => state.revealed.flatMap((r, i) => (r === null ? [i] : []));
  for (let n = 0; n < 200 && state.status !== 'finished'; n++) {
    t += 1000 + Math.floor(rnd() * 40_000);
    const wild = rnd() < 0.15;
    const down = faceDown();
    const card = wild ? Math.floor(rnd() * 26) : down[Math.floor(rnd() * down.length)];
    const turnGiver = giver(state.turn);
    const otherGiver = giver(state.turn === 'sun' ? 'moon' : 'sun');
    let actor: Actor = tbl;
    let action: Action;
    if (state.pending) {
      const own = down.filter((i) => key[i] === state.turn);
      action =
        rnd() < 0.7 ? { type: 'penaltyReveal', card: wild ? card : own[0] } : { type: 'skip' };
      actor = action.type === 'skip' ? tbl : turnGiver;
    } else if (!state.clue) {
      actor = wild ? otherGiver : turnGiver;
      action = {
        type: 'clue',
        word: ['spice', 'water', 'night', 'king', 'speed', 'kites'][Math.floor(rnd() * 6)],
        number: rnd() < 0.1 ? 'inf' : Math.floor(rnd() * 4),
      };
    } else {
      const r = rnd();
      if (r < 0.08 && state.guessedThisTurn === 0)
        [actor, action] = [otherGiver, { type: 'notAllowed' }];
      else if (r < 0.14) action = { type: 'endTurn' };
      else if (r < 0.18) action = { type: 'undoLast' };
      else if (r < 0.22) action = { type: 'timeout' };
      else action = { type: 'guess', card };
    }
    steps.push({ at: t, actor, action });
    state = applyAction(state, key, action, actor, t).state;
  }
  return { name: `random-${seed}`, starting, key, rules: { timerSec: 60 }, steps };
}

const SUN = plainKey('sun'); // 0–8 Sun, 9–16 Moon, 17–23 blank, 24 trap
const SCENARIOS: Scenario[] = [
  {
    name: 'all-found',
    starting: 'sun',
    key: SUN,
    steps: [
      ...joins,
      c(3, sun, 'Spice', 2),
      g(4, 0),
      g(5, 1),
      g(6, 2),
      c(7, moon, 'water', 1),
      g(8, 9),
      g(9, 17),
      c(10, sun, 'night', 'inf'),
      g(11, 3),
      g(12, 4),
      g(13, 5),
      g(14, 6),
      g(15, 7),
      g(16, 8),
    ],
  },
  {
    name: 'trap',
    starting: 'moon',
    key: plainKey('moon'),
    steps: [...joins, c(3, moon, 'ocean-blue', 0), c(3, moon, 'sea-blue', 0), g(4, 0), g(5, 24)],
  },
  {
    name: 'penalty-and-skip',
    starting: 'sun',
    key: SUN,
    steps: [
      ...joins,
      c(3, sun, 'water', 1),
      s(4, moon, { type: 'notAllowed' }),
      g(4, 10),
      c(4, moon, 'king', 1),
      s(5, moon, { type: 'penaltyReveal', card: 0 }),
      s(6, moon, { type: 'penaltyReveal', card: 9 }),
      c(7, moon, 'night', 1),
      s(8, sun, { type: 'notAllowed' }),
      s(30, tbl, { type: 'skip' }),
      s(70, tbl, { type: 'skip' }),
      c(71, sun, 'king', 2),
      g(72, 0),
    ],
  },
  {
    name: 'timer',
    starting: 'sun',
    key: SUN,
    rules: { timerSec: 60 },
    steps: [
      ...joins,
      c(3, sun, 'speed', 2),
      s(30, tbl, { type: 'timeout' }),
      s(63, tbl, { type: 'timeout' }),
      c(64, moon, 'night', 1),
      g(130, 9),
    ],
  },
  {
    name: 'undo',
    starting: 'sun',
    key: SUN,
    steps: [
      ...joins,
      c(3, sun, 'king', 2),
      g(4, 9),
      s(6, tbl, { type: 'undoLast' }),
      g(7, 0),
      s(20, tbl, { type: 'undoLast' }),
      s(21, tbl, { type: 'endTurn' }),
      s(22, tbl, { type: 'undoLast' }),
    ],
  },
  {
    name: 'spoken',
    starting: 'sun',
    key: SUN,
    rules: { clueEntry: 'spoken', bestOf: 3 },
    steps: [
      ...joins,
      c(3, sun, 'spoken', 2),
      c(4, sun, null, 2),
      g(5, 17),
      s(6, tbl, { type: 'resign', team: 'moon' }),
    ],
  },
  {
    name: 'errors',
    starting: 'sun',
    key: SUN,
    steps: [
      s(1, tbl, { type: 'guess', card: 0 }),
      ...joins.map((j) => ({ ...j, at: j.at + 1000 })),
      c(4, moon, 'spice', 1),
      c(5, tbl, 'spice', 1),
      c(6, sun, 'rivers', 1),
      c(7, sun, 'sun light', 1),
      c(8, sun, 'x', 10),
      g(9, 0),
      s(10, tbl, { type: 'endTurn' }),
      c(11, sun, 'kitelike', 1),
      c(12, sun, 'water', 1),
      c(12, sun, 'king', 1),
      s(13, tbl, { type: 'endTurn' }),
      g(14, 25),
      g(15, 0),
      g(16, 0),
      s(17, sun, { type: 'guess', card: 1 }),
      s(18, moon, { type: 'notAllowed' }),
      s(19, sun, { type: 'penaltyReveal', card: 1 }),
      s(20, tbl, { type: 'skip' }),
      s(21, tbl, { type: 'timeout' }),
      s(22, tbl, { type: 'resign', team: 'stars' as Team }),
      g(23, 1),
      g(24, 2),
      s(25, tbl, { type: 'resign', team: 'sun' }),
      g(26, 3),
    ],
  },
  randomGame(11),
  randomGame(23),
  randomGame(97),
];

describe('Ishaara golden fixtures', () => {
  for (const sc of SCENARIOS) {
    it(sc.name, () => {
      const out = replay(sc);
      const file = path.join(DIR, `ishaara-${sc.name}.json`);
      const text = JSON.stringify(out, null, 2) + '\n';
      if (process.env.EXPORT_FIXTURES) writeFileSync(file, text);
      expect(existsSync(file), `${file} is missing: run with EXPORT_FIXTURES=1`).toBe(true);
      expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(JSON.parse(text));
    });
  }
});
