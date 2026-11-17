import { describe, expect, it } from 'vitest';
import { kitGame, WHO, type KitEntry } from './__fixtures__/kit';
import { dailyAwards, playedMonths, SEASON_MIN_GAMES, spSeason } from './awards';
import type { SpGame, SpResult } from './types';

const TZ = 'Asia/Kolkata';
const [RIYA, ARJUN, DEV, MEERA] = WHO.map((w) => w.playerId);
/** 11:30 on 17 Nov 2026 in Kolkata. */
const DAY = Date.UTC(2026, 10, 17, 6, 0);
const H = 3600e3;

let n = 0;
const game = (
  hands: KitEntry[],
  at: number,
  winner: SpResult['winner'] = 'a',
  extra: Partial<SpGame> = {},
): SpGame => {
  n++;
  return kitGame(hands, {
    id: `g${n}`,
    syncId: `a${String(n).padStart(3, '0')}`,
    status: 'finished',
    result: { winner, endedBy: winner === 'draw' ? 'draw' : 'end' },
    finishedAt: at,
    ...extra,
  });
};
const plain: KitEntry = { bids: [3, 3, 3, 3], teamA: 7 };
const who = (awards: { code: string; playerId: string }[], code: string) =>
  awards
    .filter((a) => a.code === code)
    .map((a) => a.playerId)
    .sort();
const day = (games: SpGame[]) => dailyAwards(games, '2026-11-17', TZ);

describe('Spades daily awards', () => {
  it('Pair of the Day: most wins together, 2+, both partners', () => {
    expect(who(day([game([plain], DAY), game([plain], DAY + H)]), 'day_pair')).toEqual(
      [RIYA, DEV].sort(),
    );
    expect(who(day([game([plain], DAY)]), 'day_pair')).toEqual([]);
    // Two pairs tied on wins share it.
    const tied = [
      game([plain], DAY),
      game([plain], DAY + H),
      game([plain], DAY + 2 * H, 'b'),
      game([plain], DAY + 3 * H, 'b'),
    ];
    expect(who(day(tied), 'day_pair')).toEqual([RIYA, ARJUN, DEV, MEERA].sort());
  });

  it('Sharpest: the best contract rate from 5 bids', () => {
    const five = Array.from({ length: 5 }, () => ({ bids: [3, 3, 3, 3], teamA: 6 }));
    const g = game([...five.slice(0, 4), { bids: [3, 3, 3, 3], teamA: 5 }], DAY);
    // Team b made all five; team a four of five.
    expect(day([g]).filter((a) => a.code === 'day_sharp')).toEqual([
      { code: 'day_sharp', playerId: [ARJUN, MEERA].sort()[0], value: 1 },
      { code: 'day_sharp', playerId: [ARJUN, MEERA].sort()[1], value: 1 },
    ]);
    expect(who(day([game(five.slice(0, 4), DAY)]), 'day_sharp')).toEqual([]);
  });

  it('Nil of the Day: most Nils made, blind included', () => {
    const g = game(
      [
        { bids: [0, 3, 6, 3], teamA: 6, nil: [0, null, null, null] },
        {
          bids: [0, 3, 6, 3],
          blind: [true, false, false, false],
          teamA: 6,
          nil: [0, null, null, null],
        },
      ],
      DAY,
    );
    expect(day([g]).filter((a) => a.code === 'day_nil')).toEqual([
      { code: 'day_nil', playerId: RIYA, value: 2 },
    ]);
    expect(who(day([game([plain], DAY)]), 'day_nil')).toEqual([]);
  });

  it('Setter: most sets put on the other team, 2+', () => {
    const set = { bids: [3, 5, 3, 5], teamA: 6 };
    expect(who(day([game([set, set], DAY)]), 'day_setter')).toEqual([RIYA, DEV].sort());
    expect(who(day([game([set], DAY)]), 'day_setter')).toEqual([]);
  });

  it('Boston of the Day: everyone whose team took a Boston', () => {
    const g1 = game([{ bids: [3, 3, 3, 3], teamA: 13 }], DAY);
    const g2 = game([{ bids: [3, 3, 3, 3], teamA: 0 }], DAY + H, 'b');
    expect(day([g1, g2]).filter((a) => a.code === 'day_boston')).toEqual(
      [RIYA, ARJUN, DEV, MEERA]
        .sort()
        .map((playerId) => ({ code: 'day_boston', playerId, value: 1 })),
    );
  });

  it('Sandbagger 🙃: most bags, 5+', () => {
    const g = game([{ bids: [2, 4, 2, 4], teamA: 9 }], DAY);
    expect(day([g]).filter((a) => a.code === 'day_bags')).toEqual([
      { code: 'day_bags', playerId: [RIYA, DEV].sort()[0], value: 5 },
      { code: 'day_bags', playerId: [RIYA, DEV].sort()[1], value: 5 },
    ]);
    expect(who(day([game([{ bids: [2, 4, 2, 4], teamA: 8 }], DAY)]), 'day_bags')).toEqual([]);
  });

  it('Grinder: most hands, a replaced seat counting the hands it played', () => {
    const g = game([plain, plain, plain], DAY);
    g.hands[0].players = [RIYA, 'kabir', DEV, MEERA];
    expect(who(day([g]), 'day_grinder')).toEqual([RIYA, DEV, MEERA].sort());
  });

  it('counts only games that finished that day, in its zone', () => {
    const before = game([plain, plain], Date.UTC(2026, 10, 16, 18, 29));
    const after = game([plain, plain], Date.UTC(2026, 10, 17, 18, 30));
    expect(day([before, after])).toEqual([]);
    const inside = game([plain, plain], Date.UTC(2026, 10, 16, 18, 30));
    expect(who(day([inside]), 'day_grinder')).toHaveLength(4);
  });
});

describe('Spades seasons', () => {
  const NOV = Date.UTC(2026, 10, 5, 6);
  const OCT = Date.UTC(2026, 9, 5, 6);
  const month = (at: number, aWins: number) =>
    Array.from({ length: SEASON_MIN_GAMES }, (_, i) =>
      game([plain, plain, plain, plain], at + i * H, i < aWins ? 'a' : 'b'),
    );

  it('ranks on win rate from 10 games: ties share a place', () => {
    const s = spSeason(month(NOV, 7), '2026-11', TZ);
    expect(s.standings.map((r) => [r.playerId, r.rank, r.games, r.wins])).toEqual(
      [
        [DEV, 1, 10, 7],
        [RIYA, 1, 10, 7],
        [ARJUN, 3, 10, 3],
        [MEERA, 3, 10, 3],
      ].sort((a, b) => (a[1] as number) - (b[1] as number) || (a[0] < b[0] ? -1 : 1)),
    );
    expect(who(s.awards, 'season_champion')).toEqual([RIYA, DEV].sort());
    expect(who(s.awards, 'season_runner_up')).toEqual([]);
    expect(who(s.awards, 'season_third')).toEqual([ARJUN, MEERA].sort());
  });

  it('nobody under 10 games is ranked or awarded a place', () => {
    const s = spSeason(month(NOV, 7).slice(0, 9), '2026-11', TZ);
    expect(s.standings.every((r) => r.rank === null && !r.qualified)).toBe(true);
    expect(s.awards.filter((a) => a.code.match(/champion|runner|third|iron/))).toEqual([]);
  });

  it('Sharpest Bidder from 40 bids, Pair of the Month from 6 games together, Iron among the ranked', () => {
    const s = spSeason(month(NOV, 7), '2026-11', TZ);
    expect(who(s.awards, 'season_sharpest')).toEqual([RIYA, ARJUN, DEV, MEERA].sort());
    expect(s.awards.find((a) => a.code === 'season_pair')).toMatchObject({ value: 0.7 });
    expect(who(s.awards, 'season_pair')).toEqual([RIYA, DEV].sort());
    expect(who(s.awards, 'season_iron')).toEqual([RIYA, ARJUN, DEV, MEERA].sort());
    const short = spSeason(
      month(NOV, 7).map((g) => ({ ...g, hands: g.hands.slice(0, 3) })),
      '2026-11',
      TZ,
    );
    expect(who(short.awards, 'season_sharpest')).toEqual([]);
  });

  it('Nil Specialist: most Nils made in the month', () => {
    const games = [
      ...month(NOV, 7),
      game([{ bids: [0, 3, 6, 3], teamA: 6, nil: [0, null, null, null] }], NOV + 20 * H),
    ];
    expect(who(spSeason(games, '2026-11', TZ).awards, 'season_nil')).toEqual([RIYA]);
  });

  it('Climber: the biggest rise since last month; awards in catalogue order', () => {
    const s = spSeason([...month(OCT, 3), ...month(NOV, 7)], '2026-11', TZ);
    expect(who(s.awards, 'season_climber')).toEqual([RIYA, DEV].sort());
    const order = [...new Set(s.awards.map((a) => a.code))];
    expect(order).toEqual([
      'season_champion',
      'season_third',
      'season_sharpest',
      'season_pair',
      'season_iron',
      'season_climber',
    ]);
  });

  it('lists months with a finished game, newest first', () => {
    expect(playedMonths([...month(OCT, 3), ...month(NOV, 7)], TZ)).toEqual(['2026-11', '2026-10']);
  });
});
