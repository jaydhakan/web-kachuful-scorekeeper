import { describe, expect, it } from 'vitest';
import { applyAction, join, newGame, SKIP_AFTER_MS, UNDO_MS, wordsLeft } from './rules';
import {
  act,
  clue,
  fail,
  giver,
  pick,
  PLAYERS,
  RULES,
  started,
  T0,
  TABLE,
  WORDS,
} from './__fixtures__/kit';

// Plain key, Sun starts: cards 0–8 Sun, 9–16 Moon, 17–23 blank, 24 trap.
describe('a new game', () => {
  it('waits for both clue-givers, then starts with the starting team to clue', () => {
    let s = newGame({
      id: 'g',
      players: PLAYERS,
      words: WORDS,
      rules: RULES,
      starting: 'moon',
      now: T0,
    });
    expect(s.status).toBe('waiting');
    expect(applyAction(s, [], { type: 'endTurn' }, TABLE, T0).ok).toBe(false);
    s = join(s, 'moon', T0 + 1);
    expect(s.status).toBe('waiting');
    s = join(s, 'sun', T0 + 2);
    expect(s.status).toBe('active');
    expect(s.turn).toBe('moon');
    expect(s.revealed.every((r) => r === null)).toBe(true);
  });

  it('counts 9 words for the starting team and 8 for the other', () => {
    const { state } = started({ starting: 'moon' });
    expect(wordsLeft(state, 'moon')).toBe(9);
    expect(wordsLeft(state, 'sun')).toBe(8);
  });
});

describe('clues', () => {
  it('only the turn team’s clue-giver gives one, once per turn', () => {
    const k = started();
    expect(fail(k, giver('moon'), { type: 'clue', word: 'spice', number: 2 })).toEqual({
      code: 'not_your_turn',
    });
    expect(fail(k, TABLE, { type: 'clue', word: 'spice', number: 2 })).toEqual({
      code: 'not_your_turn',
    });
    const k2 = clue(k, 'spice', 2);
    expect(k2.state.clue).toEqual({ team: 'sun', word: 'spice', number: 2 });
    expect(fail(k2, giver('sun'), { type: 'clue', word: 'heat', number: 1 })).toMatchObject({
      reason: 'clue-given',
    });
  });

  it('allows number + 1 guesses for 1–9 and unlimited for 0 and ∞', () => {
    expect(clue(started(), 'spice', 2).state.guessesLeft).toBe(3);
    expect(clue(started(), 'spice', 0).state.guessesLeft).toBe('inf');
    expect(clue(started(), 'spice', 'inf').state.guessesLeft).toBe('inf');
  });

  it('rejects numbers outside 0–9 and ∞', () => {
    const k = started();
    for (const n of [-1, 10, 1.5])
      expect(fail(k, giver('sun'), { type: 'clue', word: 'x', number: n })).toMatchObject({
        reason: 'clue-format',
      });
  });

  it('blocks a typed clue that is a face-down word or a form of one', () => {
    const k = started();
    expect(fail(k, giver('sun'), { type: 'clue', word: 'Rivers', number: 1 })).toMatchObject({
      reason: 'clue-blocked',
    });
    expect(fail(k, giver('sun'), { type: 'clue', word: 'two words', number: 1 })).toMatchObject({
      reason: 'clue-format',
    });
  });

  it('in spoken mode takes only the number', () => {
    const k = started({ rules: { clueEntry: 'spoken' } });
    expect(fail(k, giver('sun'), { type: 'clue', word: 'spice', number: 2 })).toMatchObject({
      reason: 'clue-format',
    });
    expect(clue(k, null, 2).state.clue).toEqual({ team: 'sun', word: null, number: 2 });
  });
});

describe('guessing', () => {
  it('needs a clue first, and only the table picks', () => {
    const k = started();
    expect(fail(k, TABLE, { type: 'guess', card: 0 })).toMatchObject({ reason: 'no-clue' });
    const k2 = clue(k, 'spice', 2);
    expect(fail(k2, giver('sun'), { type: 'guess', card: 0 })).toEqual({ code: 'not_your_turn' });
  });

  it('an own word is revealed and the team guesses again', () => {
    const k = pick(clue(started(), 'spice', 2), 0);
    expect(k.state.revealed[0]).toBe('sun');
    expect(k.state.turn).toBe('sun');
    expect(k.state.guessesLeft).toBe(2);
    expect(k.state.guessedThisTurn).toBe(1);
  });

  it('the turn ends when guesses run out', () => {
    let k = clue(started(), 'spice', 1);
    k = pick(pick(k, 0), 1);
    expect(k.state.turn).toBe('moon');
    expect(k.state.clue).toBeNull();
  });

  it('the other team’s word is revealed for them and ends the turn', () => {
    const k = pick(clue(started(), 'spice', 2), 9);
    expect(k.state.revealed[9]).toBe('moon');
    expect(k.state.turn).toBe('moon');
    expect(wordsLeft(k.state, 'moon')).toBe(7);
  });

  it('a blank ends the turn', () => {
    const k = pick(clue(started(), 'spice', 2), 17);
    expect(k.state.revealed[17]).toBe('blank');
    expect(k.state.turn).toBe('moon');
  });

  it('the trap loses the game at once for the guessing team', () => {
    const k = pick(clue(started(), 'spice', 2), 24);
    expect(k.state.status).toBe('finished');
    expect(k.state.winner).toBe('moon');
    expect(k.state.endedBy).toBe('trap');
    expect(k.state.solution).toEqual(k.key);
  });

  it('a revealed card can’t be picked again', () => {
    const k = pick(clue(started(), 'spice', 3), 0);
    expect(fail(k, TABLE, { type: 'guess', card: 0 })).toMatchObject({ reason: 'revealed' });
    expect(fail(k, TABLE, { type: 'guess', card: 25 })).toMatchObject({ reason: 'bad-card' });
  });

  it('a team with every word found wins, even on the other team’s turn', () => {
    // Moon has 8 words (9–16); reveal 7 on Moon's turns, then Sun picks Moon's last.
    let k = started();
    k = pick(clue(k, 'a', 1), 17); // Sun hits a blank
    k = pick(pick(pick(pick(pick(pick(pick(clue(k, 'b', 'inf'), 9), 10), 11), 12), 13), 14), 15);
    k = act(k, TABLE, { type: 'endTurn' });
    k = pick(clue(k, 'c', 1), 16);
    expect(k.state.status).toBe('finished');
    expect(k.state.winner).toBe('moon');
    expect(k.state.endedBy).toBe('all-found');
  });

  it('the guessing team wins when it finds its last word', () => {
    let k = clue(started(), 'all', 'inf');
    for (let c = 0; c < 9; c++) k = pick(k, c);
    expect(k.state.winner).toBe('sun');
    expect(k.state.endedBy).toBe('all-found');
  });
});

describe('ending a turn', () => {
  it('End turn needs at least one guess', () => {
    const k = clue(started(), 'spice', 2);
    expect(fail(k, TABLE, { type: 'endTurn' })).toMatchObject({ reason: 'no-guess' });
    const k2 = act(pick(k, 0), TABLE, { type: 'endTurn' });
    expect(k2.state.turn).toBe('moon');
    expect(k2.state.log.at(-1)).toMatchObject({ type: 'end', team: 'sun' });
  });
});

describe('the timer', () => {
  it('starts with the clue and ends the turn only after the deadline', () => {
    const k = clue(started({ rules: { timerSec: 60 } }), 'spice', 2);
    expect(k.state.deadline).toBe(k.now + 60_000);
    expect(fail(k, TABLE, { type: 'timeout' }, 30_000)).toMatchObject({ reason: 'too-early' });
    const k2 = act(k, TABLE, { type: 'timeout' }, 60_000);
    expect(k2.state.turn).toBe('moon');
    expect(k2.state.log.at(-1)).toMatchObject({ type: 'timeout', team: 'sun' });
  });

  it('the next action after a missed deadline ends the turn first', () => {
    const k = clue(started({ rules: { timerSec: 60 } }), 'spice', 2);
    const r = applyAction(k.state, k.key, { type: 'guess', card: 0 }, TABLE, k.now + 61_000);
    expect(r.ok).toBe(false);
    expect(r.state.turn).toBe('moon');
    expect(r.state.revealed[0]).toBeNull();
  });

  it('is off by default', () => {
    expect(clue(started(), 'spice', 2).state.deadline).toBeNull();
  });
});

describe('Not allowed and the penalty', () => {
  it('only the other clue-giver, and only before the first guess', () => {
    const k = clue(started(), 'spice', 2);
    expect(fail(k, giver('sun'), { type: 'notAllowed' })).toEqual({ code: 'not_your_turn' });
    expect(fail(k, TABLE, { type: 'notAllowed' })).toEqual({ code: 'not_your_turn' });
    expect(fail(pick(k, 0), giver('moon'), { type: 'notAllowed' })).toMatchObject({
      reason: 'too-late',
    });
    expect(fail(started(), giver('moon'), { type: 'notAllowed' })).toMatchObject({
      reason: 'no-clue',
    });
  });

  it('ends the turn and the other team picks one of its own words for free', () => {
    let k = act(clue(started(), 'spice', 2), giver('moon'), { type: 'notAllowed' });
    expect(k.state.turn).toBe('moon');
    expect(k.state.pending).toEqual({ penaltyFor: 'sun', since: k.now });
    expect(fail(k, TABLE, { type: 'guess', card: 9 })).toMatchObject({ reason: 'penalty-pending' });
    expect(fail(k, giver('moon'), { type: 'clue', word: 'x', number: 1 })).toMatchObject({
      reason: 'penalty-pending',
    });
    expect(fail(k, giver('moon'), { type: 'penaltyReveal', card: 0 })).toMatchObject({
      reason: 'not-yours',
    });
    expect(fail(k, giver('sun'), { type: 'penaltyReveal', card: 9 })).toEqual({
      code: 'not_your_turn',
    });
    k = act(k, giver('moon'), { type: 'penaltyReveal', card: 9 });
    expect(k.state.revealed[9]).toBe('moon');
    expect(k.state.pending).toBeNull();
    expect(k.state.turn).toBe('moon');
  });

  it('the host can skip the pick after 60 s', () => {
    const k = act(clue(started(), 'spice', 2), giver('moon'), { type: 'notAllowed' });
    expect(fail(k, TABLE, { type: 'skip' }, SKIP_AFTER_MS - 1)).toMatchObject({
      reason: 'too-early',
    });
    const k2 = act(k, TABLE, { type: 'skip' }, SKIP_AFTER_MS);
    expect(k2.state.pending).toBeNull();
    expect(k2.state.revealed.every((r) => r === null)).toBe(true);
  });

  it('a free pick of the last word wins', () => {
    // Moon reveals 7 of its 8 on its own turn, then rules out Sun's clue and picks the 8th.
    let k = pick(clue(started(), 'a', 1), 17);
    k = pick(pick(pick(pick(pick(pick(pick(clue(k, 'b', 'inf'), 9), 10), 11), 12), 13), 14), 15);
    k = act(k, TABLE, { type: 'endTurn' });
    k = act(clue(k, 'c', 1), giver('moon'), { type: 'notAllowed' });
    k = act(k, giver('moon'), { type: 'penaltyReveal', card: 16 });
    expect(k.state.winner).toBe('moon');
    expect(k.state.endedBy).toBe('all-found');
  });
});

describe('undo', () => {
  it('takes back the last reveal from the table within 10 s', () => {
    const k = pick(clue(started(), 'spice', 2), 9);
    expect(fail(k, giver('sun'), { type: 'undoLast' })).toEqual({ code: 'not_your_turn' });
    const k2 = act(k, TABLE, { type: 'undoLast' }, UNDO_MS);
    expect(k2.state.revealed[9]).toBeNull();
    expect(k2.state.turn).toBe('sun');
    expect(k2.state.guessesLeft).toBe(3);
    expect(k2.state.log.some((e) => e.type === 'guess')).toBe(false);
    expect(k2.state.log.at(-1)).toMatchObject({ type: 'undo', card: 9 });
  });

  it('not after 10 s, nor after another action', () => {
    const k = pick(clue(started(), 'spice', 2), 0);
    expect(fail(k, TABLE, { type: 'undoLast' }, UNDO_MS + 1)).toMatchObject({ reason: 'too-late' });
    const ended = act(k, TABLE, { type: 'endTurn' });
    expect(fail(ended, TABLE, { type: 'undoLast' })).toMatchObject({ reason: 'nothing-to-undo' });
  });

  it('a rejected action leaves the undo open', () => {
    const k = pick(clue(started(), 'spice', 2), 0);
    fail(k, giver('moon'), { type: 'clue', word: 'x', number: 1 });
    expect(act(k, TABLE, { type: 'undoLast' }).state.revealed[0]).toBeNull();
  });

  it('not once the game is over', () => {
    const k = pick(clue(started(), 'spice', 2), 24);
    expect(fail(k, TABLE, { type: 'undoLast' })).toMatchObject({ reason: 'finished' });
  });
});

describe('resigning and finished games', () => {
  it('a resign ends the game for the other team', () => {
    const k = act(started(), TABLE, { type: 'resign', team: 'sun' });
    expect(k.state).toMatchObject({ status: 'finished', winner: 'moon', endedBy: 'resign' });
    expect(k.state.match).toEqual({ game: 1, sunWins: 0, moonWins: 1 });
  });

  it('nothing applies to a finished game', () => {
    const k = act(started(), TABLE, { type: 'resign', team: 'sun' });
    expect(fail(k, TABLE, { type: 'guess', card: 0 })).toMatchObject({ reason: 'finished' });
  });

  it('every applied action bumps rev; a rejected one does not', () => {
    const k = started();
    const k2 = clue(k, 'spice', 2);
    expect(k2.state.rev).toBe(k.state.rev + 1);
    const r = applyAction(k2.state, k2.key, { type: 'endTurn' }, TABLE, k2.now);
    expect(r.state.rev).toBe(k2.state.rev);
  });
});
