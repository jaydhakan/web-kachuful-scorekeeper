import { describe, expect, it } from 'vitest';
import {
  careerAchievements,
  CATALOGUE,
  gameAchievements,
  gameFacts,
  ladderCounts,
  LADDERS,
  turnMoments,
  type IshCareerRow,
} from './achievements';
import { playerRows } from './stats';
import { PLAYERS, started } from './__fixtures__/kit';
import * as played from './__fixtures__/played';
import type { Kit } from './__fixtures__/kit';

const TZ = 'Asia/Kolkata';
const [RIYA, ARJUN, DEV, MEERA] = PLAYERS.map((p) => p.playerId as string);
const SUN = [RIYA, ARJUN];
const MOON = [DEV, MEERA];

const earned = (k: Kit) => gameAchievements(gameFacts(k.state)!, TZ);
/** Who earned a code, sorted, and at which turns. */
const who = (k: Kit, code: string) =>
  [
    ...new Set(
      earned(k)
        .filter((e) => e.code === code)
        .map((e) => e.playerId),
    ),
  ].sort();
const turnsOf = (k: Kit, code: string) => [
  ...new Set(
    earned(k)
      .filter((e) => e.code === code)
      .map((e) => e.roundIndex),
  ),
];
const codes = (k: Kit) => [...new Set(earned(k).map((e) => e.code))].sort();

describe('the catalogue', () => {
  it('has the plan’s 46 codes: 5 turn, 11 game, 19 career, 5 daily, 6 season', () => {
    const n = (g: string) => CATALOGUE.filter((x) => x.group === g).length;
    expect([n('moment'), n('game'), n('career'), n('daily'), n('season')]).toEqual([
      5, 11, 19, 5, 6,
    ]);
    expect(LADDERS.map((l) => l.id)).toEqual([
      'wins',
      'games',
      'giver_wins',
      'clues',
      'found',
      'crew',
    ]);
  });
});

describe('game facts', () => {
  it('none while the game is played, or once it is abandoned', () => {
    const k = started();
    expect(gameFacts(k.state)).toBeNull();
    const gone = {
      ...k.state,
      status: 'finished' as const,
      winner: null,
      endedBy: 'abandoned' as const,
    };
    expect(gameFacts(gone)).toBeNull();
  });
});

describe('turn moments', () => {
  it('Mind Meld: every card of a clue for 3, the team’s; Overtime: the bonus guess finds another', () => {
    const k = played.meldAndOvertime();
    expect(who(k, 'mind_meld')).toEqual(SUN.sort());
    expect(who(k, 'overtime')).toEqual(SUN.sort());
    expect(turnsOf(k, 'mind_meld')).toEqual([0]);
    const meld = earned(k).find((e) => e.code === 'mind_meld')!;
    // Earned on the third guess, not the bonus one.
    const third = k.state.log.filter((e) => e.type === 'guess')[2];
    expect(meld.earnedAt).toBe(third.at);
    expect(meld.gameId).toBe(k.state.id);
  });

  it('One Word, Four Cards for 4 or more, not Mind Meld; ∞ and 0 are never found in full', () => {
    const k = played.bigClues();
    expect(who(k, 'one_word_four')).toEqual(SUN.sort());
    expect(turnsOf(k, 'one_word_four')).toEqual([0]);
    expect(codes(k)).not.toContain('mind_meld');
    // The bonus guess hit a blank.
    expect(codes(k)).not.toContain('overtime');
  });

  it('a clue for 3 with a wrong guess among the three is not a meld', () => {
    let k = played.meldAndOvertime();
    const log = k.state.log.map((e) =>
      e.type === 'guess' && e.card === 1 ? { ...e, identity: 'blank' as const } : e,
    );
    k = { ...k, state: { ...k.state, log } };
    expect(codes(k)).not.toContain('mind_meld');
    expect(codes(k)).not.toContain('overtime');
  });

  it('an undone guess doesn’t count: the clue is found in full after the mis-tap', () => {
    const k = played.undone();
    expect(k.state.log.some((e) => e.type === 'undo')).toBe(true);
    expect(who(k, 'mind_meld')).toEqual(SUN.sort());
  });

  it('Trapped goes to the guessers of the team that hit the trap, not its clue-giver', () => {
    const k = played.trapAtTheEnd();
    expect(who(k, 'trapped')).toEqual([MEERA]);
  });

  it('Own Goal: the guessers who turned over the other team’s last card', () => {
    const k = played.ownGoal();
    expect(k.state.winner).toBe('moon');
    expect(who(k, 'own_goal')).toEqual([ARJUN]);
    expect(turnsOf(k, 'own_goal')).toEqual([2]);
  });

  it('a penalty reveal is not a find, and a ruled-out clue earns nothing', () => {
    const k = played.penalty();
    expect(turnsOf(k, 'mind_meld')).toEqual([1]);
    expect(who(k, 'mind_meld')).toEqual(MOON.sort());
    // The penalty card is moon's but not found by a guess.
    expect(playerRows(k.state).find((r) => r.playerId === DEV)!.wordsFound).toBe(3);
  });

  it('live, from a log mid-game: a turn’s moments without how it ended', () => {
    let k = played.meldAndOvertime();
    const log = k.state.log.filter((e) => e.type !== 'end');
    k = { ...k, state: { ...k.state, log } };
    expect(turnMoments(log).map((m) => m.code)).toEqual(['mind_meld', 'overtime']);
  });
});

describe('game achievements', () => {
  it('Winner for the whole winning team; nothing for the losers', () => {
    const k = played.masterclass();
    expect(who(k, 'winner')).toEqual(SUN.sort());
  });

  it('a clean three-clue win: Flawless, Speedrun, and Mastermind for the clue-giver alone', () => {
    const k = played.masterclass();
    expect(k.state.endedBy).toBe('all-found');
    expect(who(k, 'flawless')).toEqual(SUN.sort());
    expect(who(k, 'speedrun')).toEqual(SUN.sort());
    expect(who(k, 'mastermind')).toEqual([RIYA]);
    expect(turnsOf(k, 'mind_meld')).toEqual([0, 2]);
    expect(turnsOf(k, 'overtime')).toEqual([0, 2]);
  });

  it('no Speedrun after 5 clues; no Mastermind when a clue was ∞', () => {
    const k = played.masterclass();
    const f = gameFacts(k.state)!;
    const clueAt = f.log.findIndex((e) => e.type === 'clue' && e.team === 'sun');
    const extra = Array.from({ length: 2 }, (_, i) => ({
      ...f.log[clueAt],
      at: f.log[clueAt].at - 10 - i,
    }));
    const more = gameAchievements({ ...f, log: [...extra, ...f.log] }, TZ);
    expect(more.some((e) => e.code === 'speedrun')).toBe(false);
    const inf = f.log.map((e, i) => (i === clueAt ? { ...e, number: 'inf' as const } : e));
    expect(gameAchievements({ ...f, log: inf }, TZ).some((e) => e.code === 'mastermind')).toBe(
      false,
    );
  });

  it('a resign win is never Flawless; White Flag for the whole team that resigned', () => {
    const k = played.meldAndOvertime();
    expect(k.state.endedBy).toBe('resign');
    expect(codes(k)).not.toContain('flawless');
    expect(who(k, 'white_flag')).toEqual(MOON.sort());
    expect(who(k, 'winner')).toEqual(SUN.sort());
  });

  it('a trap win: Lucky Escape; from 8 behind: Comeback; the other team on 1: Photo Finish', () => {
    const k = played.trapAtTheEnd();
    expect(who(k, 'lucky_escape')).toEqual(SUN.sort());
    expect(who(k, 'comeback')).toEqual(SUN.sort());
    expect(who(k, 'photo_finish')).toEqual(SUN.sort());
    // A blank guess on the way, and no all-found.
    expect(codes(k)).not.toContain('flawless');
    expect(codes(k)).not.toContain('speedrun');
  });

  it('an own goal hands moon a flawless one-clue win, no Comeback or Photo Finish', () => {
    const k = played.ownGoal();
    expect(who(k, 'speedrun')).toEqual(MOON.sort());
    expect(who(k, 'flawless')).toEqual(MOON.sort());
    expect(codes(k)).not.toContain('comeback');
    expect(codes(k)).not.toContain('photo_finish');
  });

  it('best of 3: the deciding win is a Series; 2–0 a Whitewash; game 1 neither', () => {
    const two0 = played.bestOfThree(2, { sunWins: 1, moonWins: 0 });
    expect(who(two0, 'series')).toEqual(SUN.sort());
    expect(who(two0, 'whitewash')).toEqual(SUN.sort());
    const two1 = played.bestOfThree(3, { sunWins: 1, moonWins: 1 });
    expect(who(two1, 'series')).toEqual(SUN.sort());
    expect(codes(two1)).not.toContain('whitewash');
    const first = played.bestOfThree(1, { sunWins: 0, moonWins: 0 });
    expect(codes(first)).not.toContain('series');
  });

  it('Night Owl for everyone at a game that ends between 1 and 5 am in the zone', () => {
    const k = played.lateNight();
    expect(who(k, 'night_owl')).toEqual([...SUN, ...MOON].sort());
    expect(codes(played.masterclass())).not.toContain('night_owl');
  });

  it('every row is stamped with the game, no period, and comes in a stable order', () => {
    const e = earned(played.masterclass());
    expect(e.every((x) => x.gameId === played.masterclass().state.id && x.period === null)).toBe(
      true,
    );
    expect(e.map((x) => x.earnedAt)).toEqual([...e.map((x) => x.earnedAt)].sort((a, b) => a - b));
  });
});

const T = Date.UTC(2026, 9, 1, 10);
/** One player's row in game `g` (an hour apart), with an opponent so crew has someone. */
function row(g: number, playerId: string, o: Partial<IshCareerRow> = {}): IshCareerRow {
  return {
    gameId: `g${String(g).padStart(3, '0')}`,
    playerId,
    finishedAt: T + g * 3600e3,
    won: false,
    role: 'guesser',
    wordsFound: 0,
    cluesGiven: 0,
    ...o,
  };
}

describe('careers', () => {
  it('Clue Master counts wins as clue-giver only, across games with different roles', () => {
    const rows: IshCareerRow[] = [];
    for (let g = 1; g <= 12; g++)
      rows.push(row(g, 'p', { won: true, role: g % 2 ? 'clue-giver' : 'guesser' }));
    const e = careerAchievements(rows).filter((x) => x.code.startsWith('giver_wins'));
    // Giver wins at games 1, 3, 5, 7, 9: the fifth is game 9.
    expect(e.map((x) => [x.code, x.gameId, x.data])).toEqual([['giver_wins_5', 'g009', { n: 5 }]]);
    expect(ladderCounts(rows, 'p').giver_wins).toBe(6);
  });

  it('Wordsmith and Card Hunter at the game whose total passes the step', () => {
    const rows = [
      row(1, 'p', { role: 'clue-giver', cluesGiven: 20, wordsFound: 30 }),
      row(2, 'p', { role: 'clue-giver', cluesGiven: 6, wordsFound: 25 }),
    ];
    const e = careerAchievements(rows).map((x) => [x.code, x.gameId]);
    expect(e).toContainEqual(['clues_25', 'g002']);
    expect(e).toContainEqual(['found_50', 'g002']);
    expect(ladderCounts(rows, 'p')).toMatchObject({ clues: 26, found: 55, games: 2 });
  });

  it('the shared rules: wins in a row, games played and crew', () => {
    const rows: IshCareerRow[] = [];
    for (let g = 1; g <= 10; g++) {
      rows.push(row(g, 'p', { won: g <= 3 }));
      rows.push(row(g, `o${g}`, { won: g > 3 }));
    }
    const e = careerAchievements(rows)
      .filter((x) => x.playerId === 'p')
      .map((x) => x.code);
    expect(e).toEqual(['first_win', 'back_to_back', 'hat_trick', 'crew_10', 'games_10']);
    expect(ladderCounts(rows, 'p')).toEqual({
      wins: 3,
      games: 10,
      giver_wins: 0,
      clues: 0,
      found: 0,
      crew: 10,
    });
  });

  it('nothing from no games', () => {
    expect(careerAchievements([])).toEqual([]);
  });
});
