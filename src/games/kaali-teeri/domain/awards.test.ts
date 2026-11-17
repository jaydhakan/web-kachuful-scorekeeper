import { kitGame, type KitGame, type KitHand } from './__fixtures__/kit';
import { ktFacts } from './achievements';
import { dailyAwards, playedDays, playedMonths, season } from './awards';
import type { Award } from '../../../progression/types';
import type { KtGame } from './types';

// 10:00 in Kolkata on 1 Nov 2026.
const T0 = Date.UTC(2026, 10, 1, 4, 30);
const DAY = 864e5;
const TZ = 'Asia/Kolkata';
const PEOPLE = ['ana', 'ben', 'cy', 'dee', 'eli', 'fay'];

let seq = 0;
const game = (hands: KitHand[], k: Partial<KitGame> = {}): KtGame =>
  kitGame({ id: `a${++seq}`, players: PEOPLE.slice(0, 4), start: T0, finished: true, hands, ...k });

const lone = (bidder: number, bid = 150): KitHand => ({
  bidder,
  bid,
  team: bid + 10,
  playedBy: [bidder],
});
const day = (games: KtGame[], d = '2026-11-01') => dailyAwards(ktFacts(games), d, TZ);
const of = (as: Award[], code: string) =>
  as.filter((a) => a.code === code).map((a) => [a.playerId, a.value]);

describe('daily awards', () => {
  it('Player of the Day: most points; nobody when nobody scored', () => {
    const as = day([game([lone(0), lone(1), lone(0)])]);
    expect(of(as, 'day_star')).toEqual([['ana', 600]]);
  });

  it('Bid of the Day: the biggest made bid; tied bidders share, each at their first such hand', () => {
    const as = day([
      game([
        { bidder: 0, bid: 200, team: 210 },
        { bidder: 1, bid: 220, team: 100 },
        { bidder: 2, bid: 200, team: 205 },
        { bidder: 0, bid: 200, team: 230 },
      ]),
    ]);
    expect(as.filter((a) => a.code === 'day_bid')).toEqual([
      { code: 'day_bid', playerId: 'ana', value: 200, gameId: `a${seq}`, roundIndex: 0 },
      { code: 'day_bid', playerId: 'cy', value: 200, gameId: `a${seq}`, roundIndex: 2 },
    ]);
    expect(as.filter((a) => a.code === 'day_overcooked')).toEqual([
      { code: 'day_overcooked', playerId: 'ben', value: 220, gameId: `a${seq}`, roundIndex: 1 },
    ]);
  });

  it('Partner of the Day needs 2+ hands won as a partner', () => {
    const p = { bidder: 0, bid: 150, team: 160, playedBy: [2] };
    expect(of(day([game([p, p])]), 'day_partner')).toEqual([['cy', 2]]);
    expect(of(day([game([p])]), 'day_partner')).toEqual([]);
  });

  it('Sharpest: best made rate as bidder with 3+ bids', () => {
    const miss = { bidder: 1, bid: 200, team: 100 };
    const as = day([game([lone(0), lone(0), lone(0), lone(1), lone(1), miss, lone(2), lone(2)])]);
    expect(of(as, 'day_sharp')).toEqual([['ana', 1]]);
    expect(of(day([game([lone(0), lone(0)])]), 'day_sharp')).toEqual([]);
  });

  it('Giant Killer of the day: most bids beaten as a defender, 2+', () => {
    const miss = { bidder: 0, bid: 200, team: 100 };
    const as = day([game([miss, miss])]);
    expect(of(as, 'day_killer')).toEqual([
      ['cy', 2],
      ['dee', 2],
    ]);
    expect(of(day([game([miss])]), 'day_killer')).toEqual([]);
  });

  it('Grinder: most hands played; days are the zone’s calendar days', () => {
    const early = game([lone(0)]);
    const later = kitGame({
      id: 'later',
      players: ['ana', 'eli', 'fay', 'gus'],
      start: T0,
      finished: true,
      hands: [lone(0), lone(0)],
    });
    expect(of(day([early, later]), 'day_grinder')).toEqual([['ana', 3]]);
    // 10:00 + a day in Kolkata is the next day; nothing on a day without hands.
    expect(day([early], '2026-11-02')).toEqual([]);
    expect(playedDays(ktFacts([early]), TZ)).toEqual(['2026-11-01']);
  });
});

describe('seasons', () => {
  // 8 finished games a month for ana, ben, cy, dee: ana wins 6, ben 2.
  const month = (start: number, winners: number[], extra: KitHand[] = []) =>
    winners.map((w, k) =>
      kitGame({
        id: `s${start}-${k}`,
        players: PEOPLE.slice(0, 4),
        start: start + k * DAY,
        finished: true,
        hands: [lone(w, 200), ...(k === 0 ? extra : [])],
      }),
    );

  it('ranks 8+ finished games by win rate: the podium, iron player and kingmaker among the ranked', () => {
    const partner = { bidder: 2, bid: 150, team: 160, playedBy: [3] };
    const games = month(T0, [0, 0, 0, 0, 0, 0, 1, 1], [partner, partner]);
    const s = season(ktFacts(games), '2026-11', TZ);
    expect(s.standings.map((r) => [r.playerId, r.rank, r.wins])).toEqual([
      ['ana', 1, 6],
      ['ben', 2, 2],
      ['cy', 3, 0],
      ['dee', 3, 0],
    ]);
    expect(s.awards.map((a) => [a.code, a.playerId])).toEqual([
      ['season_champion', 'ana'],
      ['season_runner_up', 'ben'],
      ['season_third', 'cy'],
      ['season_third', 'dee'],
      ['season_kingmaker', 'dee'],
      ['season_iron', 'ana'],
      ['season_iron', 'ben'],
      ['season_iron', 'cy'],
      ['season_iron', 'dee'],
    ]);
  });

  it('Sharpest Bidder needs 15+ bids; nobody ranked with fewer than 8 games', () => {
    const lots = Array.from({ length: 15 }, () => lone(1));
    const s = season(ktFacts(month(T0, [0, 0, 0, 0, 0, 0, 0, 1], lots)), '2026-11', TZ);
    expect(of(s.awards, 'season_sharpest')).toEqual([['ben', 1]]);
    const few = season(ktFacts(month(T0, [0, 0, 0, 0, 0, 0, 0])), '2026-11', TZ);
    expect(few.standings.every((r) => r.rank == null)).toBe(true);
    expect(few.awards).toEqual([]);
  });

  it('Climber: the biggest rise since last month', () => {
    const oct = month(Date.UTC(2026, 9, 1, 4, 30), [0, 0, 0, 0, 0, 0, 1, 1]);
    const nov = month(T0, [1, 1, 1, 1, 1, 1, 0, 0]);
    const s = season(ktFacts([...oct, ...nov]), '2026-11', TZ);
    expect(of(s.awards, 'season_climber')).toEqual([['ben', 1]]);
    expect(playedMonths(ktFacts([...oct, ...nov]), TZ)).toEqual(['2026-11', '2026-10']);
  });
});
