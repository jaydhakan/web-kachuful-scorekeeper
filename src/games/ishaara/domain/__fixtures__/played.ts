/**
 * Finished games played through the rules, for the achievement tests and the golden fixtures. The key is `plainKey`:
 * cards 0–8 the starting team's, 9–16 the other's, 17–23 blank, 24 the trap.
 */
import type { IshaaraPublic, Team } from '../types';
import { act, clue, giver, pick, started, TABLE, type Kit } from './kit';

const endTurn = (k: Kit) => act(k, TABLE, { type: 'endTurn' });
const resign = (k: Kit, team: Team, dt?: number) => act(k, TABLE, { type: 'resign', team }, dt);
const picks = (k: Kit, cards: number[]) => cards.reduce(pick, k);

/** A clue for 3 found in full, then the bonus guess on another of the team's cards; moon resigns at the end. */
export function meldAndOvertime(): Kit {
  let k = clue(started(), 'stream', 3);
  k = picks(k, [0, 1, 2, 3]);
  return resign(k, 'moon');
}

/**
 * Sun's three clues each found in full (3, 3 and 1 card, two bonus guesses), moon's turns ending on blanks: sun
 * finds all 9 in three clues with no wrong guess.
 */
export function masterclass(): Kit {
  let k = clue(started(), 'stream', 3);
  k = picks(k, [0, 1, 2, 3]);
  k = pick(clue(k, 'night', 1), 17);
  k = picks(clue(k, 'sea', 3), [4, 5, 6, 7]);
  k = pick(clue(k, 'night', 1), 18);
  return pick(clue(k, 'tea', 1), 8);
}

/** Clues for 4, ∞ and 0: the 4 found in full; ∞ and 0 never count as found in full. Moon resigns. */
export function bigClues(): Kit {
  let k = picks(clue(started(), 'stream', 4), [0, 1, 2, 3]);
  k = pick(k, 17);
  k = endTurnIfOn(picks(clue(k, 'night', 'inf'), [9, 10, 11]), 'moon');
  k = endTurnIfOn(picks(clue(k, 'sun', 0), [4, 5]), 'sun');
  return resign(k, 'moon');
}

const endTurnIfOn = (k: Kit, team: Team) => (k.state.turn === team ? endTurn(k) : k);

/** A mis-tap undone: the wrong card goes back face down and the clue is then found in full. Moon resigns. */
export function undone(): Kit {
  let k = picks(clue(started(), 'stream', 3), [0, 1, 9]);
  k = act(k, TABLE, { type: 'undoLast' });
  k = pick(k, 2);
  k = endTurn(k);
  return resign(k, 'moon');
}

/**
 * Sun misses, moon finds 7 for ∞ (sun 8 behind), then moon's guess hits the trap with one of its cards left:
 * comeback, photo finish and lucky escape for sun, trapped for moon's guesser.
 */
export function trapAtTheEnd(): Kit {
  let k = pick(clue(started(), 'stream', 1), 17);
  k = picks(clue(k, 'night', 'inf'), [9, 10, 11, 12, 13, 14, 15]);
  return pick(k, 24);
}

/** Sun turns over moon's last card: an own goal, and moon's win. */
export function ownGoal(): Kit {
  let k = picks(clue(started(), 'stream', 1), [0, 9]);
  k = endTurn(picks(clue(k, 'night', 9), [10, 11, 12, 13, 14, 15]));
  return pick(clue(k, 'stream', 1), 16);
}

/**
 * Moon rules sun's clue out and turns over one of its own cards; that penalty reveal is not a find. Moon then finds
 * 3 for 3 and stops; sun resigns.
 */
export function penalty(): Kit {
  let k = clue(started(), 'stream', 2);
  k = act(k, giver('moon'), { type: 'notAllowed' });
  k = act(k, giver('moon'), { type: 'penaltyReveal', card: 9 });
  k = endTurn(picks(clue(k, 'night', 3), [10, 11, 12]));
  return resign(k, 'sun');
}

/** Sun wins game `n` of a best of 3, after `before` wins each. */
export function bestOfThree(n: number, before: { sunWins: number; moonWins: number }): Kit {
  const k = started({ rules: { bestOf: 3 } });
  const state: IshaaraPublic = { ...k.state, match: { game: n, ...before } };
  return resign({ ...k, state }, 'moon');
}

/** Finished at 02:00 in Kolkata (20:30 UTC), after sun gives up. */
export function lateNight(): Kit {
  const k = clue(started(), 'stream', 1);
  return resign(k, 'sun', 7 * 3600e3);
}
