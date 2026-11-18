import { describe, expect, it } from 'vitest';
import { card, kitGame, NEWCOMER, T0, WHO, type KitEntry } from './__fixtures__/kit';
import {
  allAchievements,
  careerAchievements,
  gameAchievements,
  handMoments,
  ladderCounts,
  SP_CATALOGUE,
  SP_LADDERS,
  tableAsGame,
} from './achievements';
import type { Player } from '../../../people/types';
import type { Seat, SpGame, SpPublic, TrickRec } from './types';

const TZ = 'Asia/Kolkata';
const [RIYA, ARJUN, DEV, MEERA] = WHO.map((w) => w.playerId);

const game = (entries: KitEntry[], extra: Partial<SpGame> = {}, n = 1): SpGame =>
  kitGame(entries, {
    id: `g${n}`,
    syncId: `s${String(n).padStart(3, '0')}`,
    status: 'finished',
    result: { winner: 'a', endedBy: 'target' },
    finishedAt: T0 + n * 3600e3,
    ...extra,
  });
const active = (entries: KitEntry[]) => game(entries, { status: 'active', result: undefined });
const codes = (g: SpGame, who: string, tz?: string) =>
  gameAchievements(g, tz)
    .filter((e) => e.playerId === who)
    .map((e) => e.code);
const career = (games: SpGame[], who: string) =>
  careerAchievements(games)
    .filter((e) => e.playerId === who)
    .map((e) => e.code);

/** Thirteen tricks won by these seats in order; each led in hearts by its winner unless given. */
const tricks = (winners: Seat[], special: Record<number, TrickRec> = {}): TrickRec[] =>
  winners.map(
    (w, i) =>
      special[i] ?? {
        plays: [0, 1, 2, 3].map((k) => ({
          seat: ((w + k) % 4) as Seat,
          card: card(`${k + 3}h`),
        })),
        winner: w,
      },
  );
const online = (g: SpGame, hand: number, t: TrickRec[]): SpGame => ({
  ...g,
  hands: g.hands.map((h) => (h.index === hand ? { ...h, tricks: t } : h)),
});
const A: Seat[] = [0, 2];
const B: Seat[] = [1, 3];
const rep = (n: number, s: Seat[]) => Array.from({ length: n }, (_, i) => s[i % s.length]);

describe('the Spades catalogue', () => {
  it('has the plan’s 59 codes, each once, group by group', () => {
    const count = (g: string) => SP_CATALOGUE.filter((x) => x.group === g).length;
    expect(SP_CATALOGUE).toHaveLength(59);
    expect([
      count('moment'),
      count('game'),
      count('career'),
      count('daily'),
      count('season'),
    ]).toEqual([13, 11, 20, 7, 8]);
    expect(new Set(SP_CATALOGUE.map((x) => x.code)).size).toBe(59);
    expect(SP_LADDERS.map((l) => l.id)).toEqual(['wins', 'games', 'hands', 'made', 'nils', 'crew']);
  });

  it('marks the shame ones and never bursts them', () => {
    const shame = SP_CATALOGUE.filter((x) => x.shame).map((x) => x.code);
    expect(shame).toEqual(['sandbagged', 'blind_spot', 'bag_collector', 'day_bags']);
    expect(SP_CATALOGUE.some((x) => x.shame && x.big)).toBe(false);
  });
});

describe('Spades hand moments', () => {
  it('Boston: the team that takes all 13, both partners; the other team is set', () => {
    const g = active([{ bids: [3, 4, 3, 4], teamA: 13 }]);
    expect(codes(g, RIYA)).toEqual(['boston', 'set_them']);
    expect(codes(g, DEV)).toEqual(['boston', 'set_them']);
    expect(codes(g, ARJUN)).toEqual([]);
  });

  it('Ice Cold for a Nil made, Blindside for a Blind Nil made, only to the Nil bidder', () => {
    const nil = active([{ bids: [0, 4, 4, 4], teamA: 5, nil: [0, null, null, null] }]);
    expect(codes(nil, RIYA)).toContain('ice_cold');
    expect(codes(nil, DEV)).not.toContain('ice_cold');
    const blind = active([
      {
        bids: [0, 4, 4, 4],
        blind: [true, false, false, false],
        teamA: 5,
        nil: [0, null, null, null],
      },
    ]);
    expect(codes(blind, RIYA)).toContain('blindside');
    expect(codes(blind, RIYA)).not.toContain('ice_cold');
  });

  it('Double Trouble: both partners Nil and both made, for both; one failing spoils it', () => {
    const both = active([{ bids: [0, 6, 0, 6], teamA: 0, nil: [0, null, 0, null] }]);
    expect(codes(both, RIYA)).toEqual(['ice_cold', 'double_nil']);
    expect(codes(both, DEV)).toEqual(['ice_cold', 'double_nil']);
    // A double-Nil team has no contract: nobody sets it.
    expect(codes(both, ARJUN)).toEqual(['boston', 'high_roller']);
    const one = active([{ bids: [0, 6, 0, 6], teamA: 1, nil: [0, null, 1, null] }]);
    expect(codes(one, RIYA)).not.toContain('double_nil');
  });

  it('Nil Breaker: an opponent’s Nil fails, for both opponents, at the table too', () => {
    const g = active([{ bids: [3, 0, 4, 4], teamA: 7, nil: [null, 2, null, null] }]);
    expect(codes(g, RIYA)).toContain('nil_breaker');
    expect(codes(g, DEV)).toContain('nil_breaker');
    expect(codes(g, ARJUN)).not.toContain('nil_breaker');
    expect(codes(g, MEERA)).not.toContain('nil_breaker');
  });

  it('Set Them goes to the team that set the other', () => {
    const g = active([{ bids: [3, 5, 3, 5], teamA: 6 }]);
    expect(codes(g, RIYA)).toContain('set_them');
    expect(codes(g, ARJUN)).not.toContain('set_them');
  });

  it('High Roller: 10 or more bid together and made', () => {
    expect(codes(active([{ bids: [6, 1, 4, 1], teamA: 10 }]), RIYA)).toContain('high_roller');
    expect(codes(active([{ bids: [6, 1, 4, 1], teamA: 9 }]), RIYA)).not.toContain('high_roller');
    expect(codes(active([{ bids: [5, 1, 4, 1], teamA: 12 }]), RIYA)).not.toContain('high_roller');
  });

  it('Bang On: 7 or more bid and exactly that many taken, no bags', () => {
    expect(codes(active([{ bids: [4, 3, 3, 3], teamA: 7 }]), RIYA)).toContain('bang_on');
    expect(codes(active([{ bids: [4, 3, 3, 3], teamA: 8 }]), RIYA)).not.toContain('bang_on');
    expect(codes(active([{ bids: [3, 3, 3, 3], teamA: 6 }]), RIYA)).not.toContain('bang_on');
    // A partner's failed Nil brings bags.
    const nil = active([{ bids: [7, 3, 0, 3], teamA: 8, nil: [null, null, 1, null] }]);
    expect(codes(nil, RIYA)).not.toContain('bang_on');
  });

  it('Sandbagged 🙃: the hand that brings the 10-bag penalty', () => {
    const g = active([
      { bids: [1, 1, 1, 1], teamA: 8 },
      { bids: [1, 1, 1, 1], teamA: 8 },
    ]);
    expect(handMoments(g, 0).filter((e) => e.code === 'sandbagged')).toEqual([]);
    expect(
      handMoments(g, 1)
        .filter((e) => e.code === 'sandbagged')
        .map((e) => e.playerId),
    ).toEqual([RIYA, DEV]);
  });

  it('Blind Spot 🙃: your Blind Nil fails', () => {
    const g = active([
      {
        bids: [0, 4, 4, 4],
        blind: [true, false, false, false],
        teamA: 6,
        nil: [1, null, null, null],
      },
    ]);
    expect(codes(g, RIYA)).toContain('blind_spot');
    expect(codes(g, ARJUN)).toContain('nil_breaker');
  });

  it('Last Gasp (online): the contract reached on the 13th trick', () => {
    const base = active([{ bids: [3, 4, 3, 3], teamA: 6 }]);
    const late = online(base, 0, tricks([...rep(5, A), ...rep(7, B), 0]));
    expect(codes(late, RIYA)).toContain('last_gasp');
    expect(codes(late, ARJUN)).not.toContain('last_gasp');
    const early = online(base, 0, tricks([...rep(6, A), ...rep(7, B)]));
    expect(codes(early, RIYA)).not.toContain('last_gasp');
  });

  it('Last Gasp leaves a Nil bidder’s tricks out of the contract', () => {
    const nil = active([{ bids: [0, 4, 3, 6], teamA: 3, nil: [0, null, null, null] }]);
    const g = online(nil, 0, tricks([...rep(2, [2]), ...rep(10, B), 2]));
    expect(codes(g, DEV)).toContain('last_gasp');
    expect(codes(g, RIYA)).toContain('last_gasp');
  });

  it('Two Beats Ace (online): your 2♠ wins a trick holding the led suit’s Ace', () => {
    const cut: TrickRec = {
      plays: [
        { seat: 1, card: card('Ah') },
        { seat: 2, card: card('Kh') },
        { seat: 3, card: card('Qh') },
        { seat: 0, card: card('2s') },
      ],
      winner: 0,
    };
    const base = active([{ bids: [3, 4, 3, 3], teamA: 6 }]);
    const g = online(base, 0, tricks([...rep(6, A), ...rep(7, B)], { 0: cut }));
    expect(codes(g, RIYA)).toContain('deuce_ace');
    expect(codes(g, DEV)).not.toContain('deuce_ace');
    // A 2♠ on a spade lead, or without the Ace in the trick, isn't it.
    const noAce = { ...cut, plays: cut.plays.map((p, i) => (i ? p : { ...p, card: card('Jh') })) };
    expect(codes(online(base, 0, tricks(rep(13, A), { 0: noAce })), RIYA)).not.toContain(
      'deuce_ace',
    );
  });

  it('One-Man Band (online): seven tricks yourself', () => {
    const base = active([{ bids: [6, 3, 1, 3], teamA: 8 }]);
    const g = online(base, 0, tricks([...rep(7, [0]), 2, ...rep(5, B)]));
    expect(codes(g, RIYA)).toContain('one_man_band');
    expect(codes(g, DEV)).not.toContain('one_man_band');
    const six = online(base, 0, tricks([...rep(6, [0]), 2, 2, ...rep(5, B)]));
    expect(codes(six, RIYA)).not.toContain('one_man_band');
  });

  it('never earns an online-only code from scorekeeper data', () => {
    const g = game(
      Array.from({ length: 15 }, () => ({ bids: [6, 1, 6, 1], teamA: 13 })),
      {},
    );
    const online = new Set(['last_gasp', 'deuce_ace', 'one_man_band']);
    expect(gameAchievements(g).some((e) => online.has(e.code))).toBe(false);
  });

  it('a replaced seat: the hand goes to whoever played it, the game to whoever sat at the end', () => {
    const g = game([
      { bids: [3, 4, 3, 4], teamA: 2 },
      { bids: [3, 4, 3, 4], teamA: 2 },
    ]);
    g.hands[0].players = [RIYA, NEWCOMER.playerId, DEV, MEERA];
    g.result = { winner: 'b', endedBy: 'target' };
    expect(
      handMoments(g, 0)
        .filter((e) => e.playerId === NEWCOMER.playerId)
        .map((e) => e.code),
    ).toEqual(['set_them']);
    expect(handMoments(g, 0).some((e) => e.playerId === ARJUN)).toBe(false);
    expect(codes(g, ARJUN)).toContain('winner');
    expect(codes(g, NEWCOMER.playerId)).not.toContain('winner');
  });

  it('carries the hand’s index and doneAt', () => {
    const [e] = handMoments(active([{ bids: [3, 4, 3, 4], teamA: 13 }]), 0);
    expect(e).toMatchObject({
      gameId: 's001',
      roundIndex: 0,
      period: null,
      earnedAt: T0 + 600_000,
    });
  });

  it('a cancelled game earns nothing; one in progress earns its hands, not an ending', () => {
    const hands: KitEntry[] = [{ bids: [3, 3, 3, 3], teamA: 13 }];
    expect(gameAchievements(game(hands, { status: 'cancelled', result: undefined }))).toEqual([]);
    expect(gameAchievements(active(hands)).every((e) => e.roundIndex === 0)).toBe(true);
  });
});

describe('Spades game finishes', () => {
  const fin = (codesOf: string[]) =>
    codesOf.filter(
      (c) => !c.match(/^(boston|set_them|high_roller|bang_on|sandbagged|ice_cold|nil_breaker)$/),
    );

  it('Winner for the winning team; a draw is not a win', () => {
    const g = game([{ bids: [3, 3, 3, 3], teamA: 7 }]);
    expect(codes(g, RIYA)).toContain('winner');
    expect(codes(g, ARJUN)).not.toContain('winner');
    const draw = game([{ bids: [3, 3, 3, 3], teamA: 7 }], {
      result: { winner: 'draw', endedBy: 'draw' },
    });
    expect([RIYA, ARJUN].some((p) => codes(draw, p).includes('winner'))).toBe(false);
  });

  it('Comeback: a win after trailing by 150 after some hand', () => {
    const g = game([
      { bids: [5, 5, 5, 4], teamA: 0 },
      { bids: [4, 1, 4, 1], teamA: 13 },
    ]);
    expect(codes(g, RIYA)).toContain('comeback');
    const close = game([
      { bids: [3, 3, 3, 3], teamA: 6 },
      { bids: [3, 3, 3, 3], teamA: 7 },
    ]);
    expect(codes(close, RIYA)).not.toContain('comeback');
  });

  it('Exact: every hand made with no bags, 4+ hands, and the win', () => {
    const exact = (n: number) =>
      Array.from({ length: n }, () => ({ bids: [4, 3, 3, 3], teamA: 7 }));
    expect(codes(game(exact(4)), RIYA)).toContain('exact');
    expect(codes(game(exact(3)), RIYA)).not.toContain('exact');
    expect(codes(game([...exact(3), { bids: [4, 3, 3, 3], teamA: 8 }]), RIYA)).not.toContain(
      'exact',
    );
  });

  it('Mercy: a win by the mercy rule', () => {
    const g = game([{ bids: [3, 3, 3, 3], teamA: 7 }], {
      result: { winner: 'a', endedBy: 'mercy' },
    });
    expect(codes(g, DEV)).toContain('mercy');
    expect(codes(g, ARJUN)).not.toContain('mercy');
  });

  it('Shutout: the other team never above 0, 3+ hands', () => {
    const h = { bids: [3, 3, 3, 3], teamA: 10 };
    expect(codes(game([h, h, h]), RIYA)).toContain('shutout');
    expect(codes(game([h, h]), RIYA)).not.toContain('shutout');
  });

  it('Wire to Wire: ahead after every hand of 5+, and the win', () => {
    const h = { bids: [3, 3, 3, 3], teamA: 7 };
    expect(codes(game([h, h, h, h, h]), RIYA)).toContain('wire_to_wire');
    expect(codes(game([h, h, h, h]), RIYA)).not.toContain('wire_to_wire');
    expect(codes(game([{ bids: [3, 3, 3, 3], teamA: 6 }, h, h, h, h, h]), RIYA)).not.toContain(
      'wire_to_wire',
    );
  });

  it('Photo Finish by 20 or fewer, Runaway by 200 or more', () => {
    expect(fin(codes(game([{ bids: [3, 3, 3, 3], teamA: 7 }]), RIYA))).toEqual([
      'winner',
      'photo_finish',
    ]);
    const big = game([
      { bids: [5, 1, 5, 1], teamA: 12 },
      { bids: [5, 1, 5, 1], teamA: 12 },
    ]);
    expect(fin(codes(big, RIYA))).toEqual(['winner', 'runaway']);
  });

  it('Bag Collector 🙃: two 10-bag penalties in one game, win or lose', () => {
    const h = { bids: [1, 1, 1, 1], teamA: 12 };
    const g = game([h, h], { result: { winner: 'b', endedBy: 'end' } });
    expect(codes(g, RIYA)).toContain('bag_collector');
    expect(codes(game([h]), RIYA)).not.toContain('bag_collector');
  });

  it('Marathon: 15 hands or more, for everyone at the end', () => {
    const h = { bids: [3, 3, 3, 3], teamA: 6 };
    const g = game(Array.from({ length: 15 }, () => h));
    expect(codes(g, ARJUN)).toContain('marathon');
    expect(codes(game(Array.from({ length: 14 }, () => h)), ARJUN)).not.toContain('marathon');
  });

  it('Night Owl: finished between 1 and 5 am in the zone', () => {
    const h = [{ bids: [3, 3, 3, 3], teamA: 6 }];
    const night = game(h, { finishedAt: Date.UTC(2026, 10, 16, 21, 0) });
    expect(codes(night, MEERA, TZ)).toContain('night_owl');
    const day = game(h, { finishedAt: Date.UTC(2026, 10, 17, 6, 0) });
    expect(codes(day, MEERA, TZ)).not.toContain('night_owl');
  });

  it('an online table goes through the same rules', () => {
    const t = {
      id: 'tbl',
      rev: 3,
      createdAt: T0,
      updatedAt: T0 + 10,
      finishedAt: T0 + 10,
      status: 'finished',
      rules: kitGame([]).rules,
      seats: WHO.map((who) => ({ who, ready: true, away: false, timeouts: 0 })),
      history: kitGame([{ bids: [3, 3, 3, 3], teamA: 13 }]).hands,
      result: { winner: 'a', endedBy: 'end' },
    } as unknown as SpPublic;
    const g = tableAsGame(t);
    expect(g.syncId).toBe('tbl');
    expect(codes(g, RIYA)).toEqual(['boston', 'set_them', 'winner']);
  });
});

const named = (name: string, n: number): Player => ({
  id: `p-${name}`,
  name,
  emoji: '🙂',
  color: '#f5a524',
  playerId: `90000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
});

describe('Spades careers', () => {
  const win = (
    n: number,
    winner: 'a' | 'b' | 'draw' = 'a',
    hands: KitEntry[] = [{ bids: [3, 3, 3, 3], teamA: 7 }],
  ) => game(hands, { result: { winner, endedBy: winner === 'draw' ? 'draw' : 'end' } }, n);

  it('First Win, Back to Back, Hat-trick: runs of wins; a draw ends a run', () => {
    const games = [win(1), win(2), win(3, 'draw'), win(4), win(5), win(6)];
    expect(career(games, RIYA).filter((c) => !c.startsWith('games'))).toEqual([
      'first_win',
      'back_to_back',
      'back_to_back',
      'hat_trick',
    ]);
    expect(career(games, ARJUN)).toEqual([]);
  });

  it('games_10 at the tenth finished game, draws included', () => {
    const games = Array.from({ length: 10 }, (_, i) => win(i + 1, i % 2 ? 'draw' : 'b'));
    const g10 = careerAchievements(games).filter((e) => e.code === 'games_10');
    expect(g10.map((e) => e.playerId).sort()).toEqual([RIYA, ARJUN, DEV, MEERA].sort());
    expect(g10[0]).toMatchObject({ gameId: 's010', data: { n: 10 } });
  });

  it('hands_100, made_50 and nils_5 at the game that reaches them', () => {
    const made = (n: number) =>
      win(
        n,
        'a',
        Array.from({ length: 25 }, () => ({ bids: [3, 3, 3, 3], teamA: 6 })),
      );
    const games = [made(1), made(2), made(3), made(4)];
    const mine = careerAchievements(games).filter((e) => e.playerId === RIYA);
    expect(mine.find((e) => e.code === 'hands_100')).toMatchObject({ gameId: 's004' });
    expect(mine.find((e) => e.code === 'made_50')).toMatchObject({ gameId: 's002' });
    const nil = (n: number) =>
      win(n, 'a', [{ bids: [0, 3, 6, 3], teamA: 6, nil: [0, null, null, null] }]);
    const nils = Array.from({ length: 5 }, (_, i) => nil(i + 1));
    expect(careerAchievements(nils).find((e) => e.code === 'nils_5')).toMatchObject({
      playerId: RIYA,
      gameId: 's005',
    });
  });

  it('a seat replaced mid-game still counts its hands', () => {
    const g = win(
      1,
      'a',
      Array.from({ length: 100 }, () => ({ bids: [3, 3, 3, 3], teamA: 6 })),
    );
    for (const h of g.hands.slice(0, 99)) h.players = [RIYA, NEWCOMER.playerId, DEV, MEERA];
    expect(ladderCounts([g], NEWCOMER.playerId)).toMatchObject({ hands: 99, games: 0 });
    expect(ladderCounts([g], ARJUN)).toMatchObject({ hands: 1, games: 1 });
  });

  it('Crew: 10 different people shared a finished table with', () => {
    const people = Array.from({ length: 12 }, (_, i) => named(`x${i}`, i + 1));
    const riya = { ...kitGame([]).players[0] };
    const games = [0, 1, 2, 3].map((k) =>
      game(
        [{ bids: [3, 3, 3, 3], teamA: 7 }],
        { players: [riya, ...people.slice(k * 3, k * 3 + 3)] },
        k + 1,
      ),
    );
    const c = careerAchievements(games).filter((e) => e.playerId === RIYA && e.code === 'crew_10');
    expect(c).toEqual([expect.objectContaining({ gameId: 's004', data: { n: 10 } })]);
    expect(ladderCounts(games, RIYA).crew).toBe(12);
  });

  it('Perfect Pair 🤝: ten wins with one partner, once per partner, at the tenth', () => {
    const games = Array.from({ length: 11 }, (_, i) => win(i + 1));
    const pp = careerAchievements(games).filter((e) => e.code === 'perfect_pair');
    expect(pp.map((e) => [e.playerId, e.gameId, e.data])).toEqual([
      [RIYA, 's010', { partner: DEV }],
      [DEV, 's010', { partner: RIYA }],
    ]);
    expect(career(games.slice(2), RIYA)).not.toContain('perfect_pair');
  });

  it('counts each ladder the way its codes are earned', () => {
    const games = [win(1), win(2), win(3, 'b')];
    expect(ladderCounts(games, RIYA)).toEqual({
      wins: 2,
      games: 3,
      hands: 3,
      made: 3,
      nils: 0,
      crew: 3,
    });
  });

  it('allAchievements is everything, oldest first', () => {
    const all = allAchievements([win(2), win(1)]);
    expect(all.map((e) => e.earnedAt)).toEqual(
      [...all.map((e) => e.earnedAt)].sort((a, b) => a - b),
    );
    expect(all.some((e) => e.code === 'first_win')).toBe(true);
  });
});
