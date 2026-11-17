import { kitGame, type KitGame, type KitHand } from './__fixtures__/kit';
import {
  allAchievements,
  careerAchievements,
  gameAchievements,
  KT_ACHIEVEMENTS,
  KT_LADDERS,
  ktFacts,
  ladderCounts,
  momentsOfHand,
} from './achievements';
import type { Earned } from '../../../progression/types';
import type { KtGame } from './types';

const T0 = Date.UTC(2026, 10, 1, 13, 30);
const DAY = 864e5;
const PEOPLE = ['ana', 'ben', 'cy', 'dee', 'eli', 'fay', 'gus', 'hal', 'ivy', 'jo', 'kai', 'lu'];

let seq = 0;
const game = (n: number, hands: KitHand[], k: Partial<KitGame> = {}): KtGame =>
  kitGame({
    id: `g${++seq}`,
    players: PEOPLE.slice(0, n),
    start: T0 + seq * DAY,
    finished: true,
    hands,
    ...k,
  });

const earned = (...games: KtGame[]) => allAchievements(ktFacts(games), 'UTC');
const who = (es: Earned[], code: string) =>
  [...new Set(es.filter((e) => e.code === code).map((e) => e.playerId))].sort();
const one = (es: Earned[], code: string) => es.filter((e) => e.code === code);

/** A made hand the bidder holds alone: bid × 2 to the bidder, nothing to anyone else. */
const lone = (bidder: number, bid = 150): KitHand => ({
  bidder,
  bid,
  team: bid + 10,
  playedBy: [bidder],
});

describe('the catalogue', () => {
  it('has the plan’s 10 hand, 11 game, 23 career, 7 daily and 7 season codes, each once', () => {
    const by = (g: string) => KT_ACHIEVEMENTS.filter((a) => a.group === g).length;
    expect([by('moment'), by('game'), by('career'), by('daily'), by('season')]).toEqual([
      10, 11, 23, 7, 7,
    ]);
    expect(new Set(KT_ACHIEVEMENTS.map((a) => a.code)).size).toBe(58);
  });

  it('every ladder code is a career code', () => {
    const career = new Set(KT_ACHIEVEMENTS.filter((a) => a.group === 'career').map((a) => a.code));
    for (const l of KT_LADDERS) for (const c of l.codes) expect(career.has(c), c).toBe(true);
  });

  it('shame ones are never big', () => {
    for (const a of KT_ACHIEVEMENTS) expect(a.big && a.shame, a.code).toBeFalsy();
  });
});

describe('hand moments', () => {
  it('High Roller: a made bid of 80% of the deck, 200 with one deck and 400 with two', () => {
    expect(who(earned(game(4, [{ bidder: 0, bid: 200, team: 210 }])), 'high_roller')).toEqual([
      'ana',
    ]);
    expect(who(earned(game(4, [{ bidder: 0, bid: 195, team: 210 }])), 'high_roller')).toEqual([]);
    expect(who(earned(game(7, [{ bidder: 0, bid: 400, team: 410 }])), 'high_roller')).toEqual([
      'ana',
    ]);
    expect(who(earned(game(7, [{ bidder: 0, bid: 395, team: 410 }])), 'high_roller')).toEqual([]);
    // Failed, it is Overcooked instead.
    expect(who(earned(game(4, [{ bidder: 0, bid: 200, team: 150 }])), 'high_roller')).toEqual([]);
  });

  it('All In: the whole deck bid and made, which is also a clean sweep', () => {
    const es = earned(game(4, [{ bidder: 0, bid: 250, team: 250 }]));
    expect(who(es, 'all_in')).toEqual(['ana']);
    expect(who(es, 'clean_sweep')).toEqual(['ana', 'ben']);
    expect(who(earned(game(7, [{ bidder: 2, bid: 500, team: 500 }])), 'all_in')).toEqual(['cy']);
    expect(who(earned(game(4, [{ bidder: 0, bid: 250, team: 245 }])), 'all_in')).toEqual([]);
  });

  it('Clean Sweep goes to the whole bidding side, Brick Wall to every defender', () => {
    const sweep = earned(game(6, [{ bidder: 0, bid: 160, playedBy: [3, 5], team: 250 }]));
    expect(who(sweep, 'clean_sweep')).toEqual(['ana', 'dee', 'fay']);
    expect(who(sweep, 'brick_wall')).toEqual([]);
    const wall = earned(game(6, [{ bidder: 0, bid: 160, playedBy: [3, 5], team: 0 }]));
    expect(who(wall, 'brick_wall')).toEqual(['ben', 'cy', 'eli']);
    expect(who(wall, 'clean_sweep')).toEqual([]);
  });

  it('Lone Wolf: the bidder held every called card and made it', () => {
    expect(who(earned(game(4, [lone(2)])), 'lone_wolf')).toEqual(['cy']);
    const both = game(6, [{ bidder: 1, bid: 160, playedBy: [1, 1], team: 170 }]);
    expect(who(earned(both), 'lone_wolf')).toEqual(['ben']);
    // A partner, or a miss, and it isn't.
    expect(
      who(earned(game(6, [{ bidder: 1, bid: 160, playedBy: [1, 3], team: 170 }])), 'lone_wolf'),
    ).toEqual([]);
    expect(
      who(earned(game(4, [{ bidder: 1, bid: 160, playedBy: [1], team: 150 }])), 'lone_wolf'),
    ).toEqual([]);
  });

  it('Double Agent: a partner (never the bidder) with two or more slots on a made bid', () => {
    const es = earned(game(6, [{ bidder: 0, bid: 170, playedBy: [3, 3], team: 180 }]));
    expect(who(es, 'double_agent')).toEqual(['dee']);
    expect(one(es, 'double_agent')[0].data).toEqual({ slots: 2 });
    expect(
      who(earned(game(6, [{ bidder: 0, bid: 160, playedBy: [0, 0], team: 165 }])), 'double_agent'),
    ).toEqual([]);
    expect(
      who(earned(game(6, [{ bidder: 0, bid: 170, playedBy: [3, 3], team: 160 }])), 'double_agent'),
    ).toEqual([]);
    expect(
      who(earned(game(6, [{ bidder: 0, bid: 170, playedBy: [3, 4], team: 180 }])), 'double_agent'),
    ).toEqual([]);
  });

  it('Giant Killer: every defender beating a bid of 80% of the deck', () => {
    expect(who(earned(game(4, [{ bidder: 0, bid: 200, team: 190 }])), 'giant_killer')).toEqual([
      'cy',
      'dee',
    ]);
    expect(who(earned(game(4, [{ bidder: 0, bid: 195, team: 190 }])), 'giant_killer')).toEqual([]);
    // Eight players call three partners: four defend.
    expect(who(earned(game(8, [{ bidder: 0, bid: 400, team: 300 }])), 'giant_killer')).toEqual([
      'eli',
      'fay',
      'gus',
      'hal',
    ]);
  });

  it('Stuck With It: made a bid forced on them; quick-mode hands never know, so never earn it', () => {
    const forced = (team: number) =>
      game(4, [
        {
          bidder: 1,
          bid: 150,
          team,
          calls: [
            [0, 'pass'],
            [1, 'pass'],
            [2, 'pass'],
            [3, 'pass'],
            [0, 'forced'],
          ],
        },
      ]);
    expect(who(earned(forced(160)), 'stuck_with_it')).toEqual(['ben']);
    expect(who(earned(forced(140)), 'stuck_with_it')).toEqual([]);
    expect(who(earned(game(4, [{ bidder: 1, bid: 150, team: 160 }])), 'stuck_with_it')).toEqual([]);
  });

  it('So Close: the bidder missed by exactly 5', () => {
    expect(who(earned(game(4, [{ bidder: 3, bid: 180, team: 175 }])), 'so_close')).toEqual(['dee']);
    expect(who(earned(game(4, [{ bidder: 3, bid: 180, team: 170 }])), 'so_close')).toEqual([]);
    expect(who(earned(game(4, [{ bidder: 3, bid: 180, team: 180 }])), 'so_close')).toEqual([]);
  });

  it('Overcooked: the bidder failed a bid of 80% of the deck', () => {
    expect(who(earned(game(4, [{ bidder: 0, bid: 200, team: 150 }])), 'overcooked')).toEqual([
      'ana',
    ]);
    expect(who(earned(game(7, [{ bidder: 0, bid: 380, team: 300 }])), 'overcooked')).toEqual([]);
    expect(who(earned(game(7, [{ bidder: 0, bid: 400, team: 395 }])), 'overcooked')).toEqual([
      'ana',
    ]);
  });

  it('a moment carries its hand and time, and an unfinished game still earns them', () => {
    const g = game(4, [{ bidder: 0, bid: 160, team: 165 }, lone(1, 200)], { finished: false });
    const [e] = one(earned(g), 'high_roller');
    expect(e).toMatchObject({ playerId: 'ben', gameId: g.syncId, roundIndex: 1, period: null });
    expect(e.earnedAt).toBe(g.hands[1].doneAt);
    expect(momentsOfHand(g, 1).map((x) => x.code)).toEqual(['high_roller', 'lone_wolf']);
    expect(momentsOfHand(g, 0)).toEqual([]);
  });
});

describe('game finish', () => {
  it('Winner: everyone tied for first; nothing until the game has ended', () => {
    const tie = game(4, [
      { bidder: 0, bid: 150, team: 160, playedBy: [1] },
      { bidder: 2, bid: 150, team: 160, playedBy: [3] },
    ]);
    expect(who(earned(tie), 'winner')).toEqual(['ana', 'ben', 'cy', 'dee']);
    expect(who(earned(tie), 'wooden_spoon')).toEqual([]);
    const open = game(4, [lone(0)], { finished: false });
    expect(earned(open).filter((e) => e.roundIndex == null)).toEqual([]);
  });

  const comeback = [
    ...Array.from({ length: 3 }, () => ({ bidder: 1, bid: 150, team: 160, playedBy: [2] })),
    { bidder: 0, bid: 250, team: 250, playedBy: [3] },
    { bidder: 0, bid: 250, team: 250, playedBy: [3] },
    lone(0, 250),
  ];

  it('Comeback: last (with someone ahead) after a hand at or past halfway, then won, 6+ hands', () => {
    const es = earned(game(4, comeback));
    expect(who(es, 'winner')).toEqual(['ana']);
    expect(who(es, 'comeback')).toEqual(['ana']);
    expect(who(earned(game(4, comeback.slice(1))), 'comeback')).toEqual([]);
  });

  it('Wire to Wire: first after every hand of a 6+ hand game, and won', () => {
    expect(
      who(
        earned(
          game(
            4,
            Array.from({ length: 6 }, () => lone(2)),
          ),
        ),
        'wire_to_wire',
      ),
    ).toEqual(['cy']);
    expect(
      who(
        earned(
          game(
            4,
            Array.from({ length: 5 }, () => lone(2)),
          ),
        ),
        'wire_to_wire',
      ),
    ).toEqual([]);
    expect(who(earned(game(4, comeback)), 'wire_to_wire')).toEqual([]);
  });

  it('Thousandaire: 1,000 points in one game, endless or first to 1000', () => {
    const hands = Array.from({ length: 4 }, () => lone(0));
    expect(who(earned(game(4, hands)), 'thousandaire')).toEqual(['ana']);
    expect(who(earned(game(4, hands, { length: 'to1000' })), 'thousandaire')).toEqual(['ana']);
    expect(who(earned(game(4, hands.slice(1))), 'thousandaire')).toEqual([]);
  });

  it('Never Wrong: bid 3+ times and made every one', () => {
    expect(who(earned(game(4, [lone(0), lone(0), lone(0)])), 'never_wrong')).toEqual(['ana']);
    expect(who(earned(game(4, [lone(0), lone(0)])), 'never_wrong')).toEqual([]);
    expect(
      who(
        earned(game(4, [lone(0), lone(0), lone(0), { bidder: 0, bid: 200, team: 100 }])),
        'never_wrong',
      ),
    ).toEqual([]);
  });

  it('Kingmaker: 3+ hands won as a called partner', () => {
    const won = { bidder: 0, bid: 150, team: 160, playedBy: [2] };
    expect(who(earned(game(4, [won, won, won])), 'kingmaker')).toEqual(['cy']);
    expect(who(earned(game(4, [won, won, { ...won, team: 100 }])), 'kingmaker')).toEqual([]);
  });

  it('Wooden Spoon: last, ties included', () => {
    expect(who(earned(game(4, [lone(0), lone(1)])), 'wooden_spoon')).toEqual(['cy', 'dee']);
  });

  it('Blanked: 0 points after 6+ hands', () => {
    expect(
      who(
        earned(
          game(
            4,
            Array.from({ length: 6 }, () => lone(0)),
          ),
        ),
        'blanked',
      ),
    ).toEqual(['ben', 'cy', 'dee']);
    expect(
      who(
        earned(
          game(
            4,
            Array.from({ length: 5 }, () => lone(0)),
          ),
        ),
        'blanked',
      ),
    ).toEqual([]);
  });

  it('Full House: a 10-player game; Marathon: 20+ hands', () => {
    expect(who(earned(game(10, [lone(0, 350)])), 'full_house')).toHaveLength(10);
    expect(who(earned(game(9, [lone(0, 350)])), 'full_house')).toEqual([]);
    const long = (n: number) => Array.from({ length: n }, (_, i) => lone(i % 4));
    expect(who(earned(game(4, long(20))), 'marathon')).toHaveLength(4);
    expect(one(earned(game(4, long(20))), 'marathon')[0].data).toEqual({ hands: 20 });
    expect(who(earned(game(4, long(19))), 'marathon')).toEqual([]);
  });

  it('Night Owl: finished between 1 and 5 am in the zone given', () => {
    const at = (h: number) =>
      kitGame({
        id: `n${h}`,
        players: PEOPLE.slice(0, 4),
        start: Date.UTC(2026, 10, 3, h, 0),
        finished: true,
        hands: [lone(0)],
      });
    // Ends 6 minutes after the start (one hand at 5, finished a minute later).
    expect(who(earned(at(1)), 'night_owl')).toHaveLength(4);
    expect(who(earned(at(5)), 'night_owl')).toEqual([]);
    expect(who(earned(at(0)), 'night_owl')).toEqual([]);
  });
});

describe('career', () => {
  it('win streaks, games and crew over ended games only', () => {
    const wins = Array.from({ length: 3 }, () => game(4, [lone(0)]));
    const es = earned(...wins, game(4, [lone(0)], { finished: false }));
    expect(one(es, 'first_win')).toHaveLength(1);
    expect(who(es, 'back_to_back')).toEqual(['ana']);
    expect(who(es, 'hat_trick')).toEqual(['ana']);
    const ten = Array.from({ length: 10 }, () => game(4, [lone(1)]));
    expect(who(earned(...ten), 'games_10')).toEqual(['ana', 'ben', 'cy', 'dee']);
    expect(who(earned(...ten.slice(1)), 'games_10')).toEqual([]);
    const crewOf = (k: number) =>
      kitGame({
        id: `c${k}`,
        players: ['ana', ...PEOPLE.slice(1 + 3 * k, 4 + 3 * k)],
        start: T0 + k * DAY,
        finished: true,
        hands: [lone(0)],
      });
    expect(who(earned(crewOf(0), crewOf(1), crewOf(2)), 'crew_10')).toEqual([]);
    expect(who(earned(crewOf(0), crewOf(1), crewOf(2), crewOf(3)), 'crew_10')).toEqual(['ana']);
  });

  it('hands, bids made and partner wins count every done hand, finished or not, at the hand', () => {
    const many = Array.from({ length: 10 }, () => ({
      bidder: 0,
      bid: 150,
      team: 160,
      playedBy: [1],
    }));
    const g1 = game(4, many),
      g2 = game(4, many, { finished: false });
    const es = earned(
      ...Array.from({ length: 4 }, () => game(4, many, { finished: false })),
      g1,
      g2,
    );
    expect(who(es, 'made_10')).toEqual(['ana']);
    expect(who(es, 'partner_10')).toEqual(['ben']);
    expect(who(es, 'hands_100')).toEqual([]);
    const lots = Array.from({ length: 10 }, () => game(4, many, { finished: false }));
    const hundred = one(earned(...lots), 'hands_100');
    expect(hundred.map((e) => e.playerId).sort()).toEqual(['ana', 'ben', 'cy', 'dee']);
    expect(hundred[0]).toMatchObject({ roundIndex: 9, data: { n: 100 } });
    expect(one(earned(...lots), 'made_50')).toHaveLength(1);
    expect(one(earned(...lots), 'made_100')).toHaveLength(1);
  });

  it('streaks: 3, 5 and 8 bids made in a row as bidder, across games; a miss starts again', () => {
    const miss = { bidder: 0, bid: 200, team: 100 };
    const es = earned(game(4, [lone(0), lone(0)]), game(4, [lone(0), miss, lone(0), lone(0)]));
    expect(one(es, 'streak_3')).toHaveLength(1);
    // A partner or defender's hand doesn't break it.
    const between = earned(game(4, [lone(0), lone(1), lone(0), lone(0)]));
    expect(who(between, 'streak_3')).toEqual(['ana']);
    // Reached twice, earned twice, as runs of wins are.
    const twice = earned(game(4, [lone(0), lone(0), lone(0), miss, lone(0), lone(0), lone(0)]));
    expect(one(twice, 'streak_3')).toHaveLength(2);
  });

  it('Partners in Crime: 10 hands won on the same side as one person, once per person', () => {
    const together = { bidder: 0, bid: 150, team: 160, playedBy: [1] };
    const nine = earned(
      game(
        4,
        Array.from({ length: 9 }, () => together),
      ),
    );
    expect(one(nine, 'partners_in_crime')).toEqual([]);
    const es = earned(
      game(
        4,
        Array.from({ length: 20 }, () => together),
      ),
    );
    expect(one(es, 'partners_in_crime').map((e) => [e.playerId, e.data.with])).toEqual([
      ['ana', 'ben'],
      ['ben', 'ana'],
    ]);
    // A lost hand together doesn't count.
    const lost = { ...together, team: 100 };
    const mixed = earned(game(4, [...Array.from({ length: 9 }, () => together), lost]));
    expect(one(mixed, 'partners_in_crime')).toEqual([]);
  });

  it('Partners in Crime: two people reaching it in one hand, the second waits for the next win', () => {
    const trio = { bidder: 0, bid: 160, team: 170, playedBy: [1, 2] };
    const es = earned(game(6, [...Array.from({ length: 11 }, () => trio)]));
    const ana = one(es, 'partners_in_crime').filter((e) => e.playerId === 'ana');
    expect(ana.map((e) => [e.roundIndex, e.data.with])).toEqual([
      [9, 'ben'],
      [10, 'cy'],
    ]);
  });

  it('ladder counts read the same as the codes', () => {
    const miss = { bidder: 0, bid: 200, team: 100 };
    const partner = { bidder: 1, bid: 150, team: 160, playedBy: [0] };
    const f = ktFacts([
      game(4, [lone(0), lone(0), miss, partner]),
      game(4, [lone(1)]),
      game(4, [lone(0)], { finished: false }),
    ]);
    expect(ladderCounts(f, 'ana')).toEqual({
      wins: 1,
      games: 2,
      hands: 6,
      made: 3,
      partner: 1,
      streak: 2,
      crew: 3,
    });
  });

  it('career rows keep the game and hand that earned them', () => {
    const g = game(4, [lone(0), lone(0), lone(0)]);
    const [s] = one(careerAchievements(ktFacts([g])), 'streak_3');
    expect(s).toMatchObject({ gameId: g.syncId, roundIndex: 2, earnedAt: g.hands[2].doneAt });
    expect(gameAchievements(ktFacts([g])).some((e) => e.code === 'streak_3')).toBe(false);
  });
});
