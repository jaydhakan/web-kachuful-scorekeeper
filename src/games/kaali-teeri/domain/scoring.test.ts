import { T0, kitGame, rng, type KitHand } from './__fixtures__/kit';
import {
  deckTotal,
  enteredPoints,
  gameOver,
  handScore,
  result,
  slots,
  standings,
  team,
  teamPointsFrom,
  totals,
  type CardRef,
  type KtGame,
} from './index';

const AS: CardRef = { rank: 'A', suit: 'spades' },
  KS: CardRef = { rank: 'K', suit: 'spades' };

/** One hand on its own table: 4 players (1 partner) unless `players` says otherwise. */
const one = (h: KitHand, players = ['a', 'b', 'c', 'd']) =>
  kitGame({ id: 'x', players, start: T0, hands: [h] });
const score = (g: KtGame) => {
  const s = handScore(
    g.hands[0],
    g.rules,
    g.players.map((p) => p.id),
  );
  return g.players.map((p) => s[p.id]);
};
const six = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('§2.4 team and slots', () => {
  it('the team is the bidder and everyone who played a called card', () => {
    const g = one({ bidder: 0, bid: 160, called: [AS, KS], playedBy: [2, 4], team: 100 }, six);
    expect(team(g.hands[0])).toEqual(['p0', 'p2', 'p4']);
    expect(slots(g.hands[0])).toEqual({ p0: 1, p2: 1, p4: 1 });
  });

  it('a partner who played two called cards fills two slots', () => {
    const g = one({ bidder: 0, bid: 160, called: [AS, KS], playedBy: [3, 3], team: 100 }, six);
    expect(team(g.hands[0])).toEqual(['p0', 'p3']);
    expect(slots(g.hands[0])).toEqual({ p0: 1, p3: 2 });
  });

  it('the bidder holding one called card fills two, holding two fills three', () => {
    const a = one({ bidder: 1, bid: 160, called: [AS, KS], playedBy: [1, 5], team: 100 }, six);
    expect(slots(a.hands[0])).toEqual({ p1: 2, p5: 1 });
    const b = one({ bidder: 1, bid: 160, called: [AS, KS], playedBy: [1, 1], team: 100 }, six);
    expect(team(b.hands[0])).toEqual(['p1']);
    expect(slots(b.hands[0])).toEqual({ p1: 3 });
  });

  it('an unmarked card adds nobody yet; no bidder means no team', () => {
    const g = one(
      { bidder: 0, bid: 160, called: [AS, KS], playedBy: [2, null], phase: 'playing' },
      six,
    );
    expect(team(g.hands[0])).toEqual(['p0', 'p2']);
    expect(team({ ...g.hands[0], bidder: null })).toEqual([]);
    expect(slots({ ...g.hands[0], bidder: null })).toEqual({});
  });
});

describe('§2.4 scoring', () => {
  it('made: bidder and partner get the bid, defenders nothing', () => {
    expect(score(one({ bidder: 0, bid: 180, team: 190 }))).toEqual([180, 180, 0, 0]);
  });

  it('exactly the bid is made', () => {
    expect(score(one({ bidder: 0, bid: 180, team: 180 }))).toEqual([180, 180, 0, 0]);
  });

  it('made with two slots pays double, three pays triple', () => {
    const g = one({ bidder: 0, bid: 160, called: [AS, KS], playedBy: [3, 3], team: 200 }, six);
    expect(score(g)).toEqual([160, 0, 0, 320, 0, 0]);
    const h = one({ bidder: 0, bid: 160, called: [AS, KS], playedBy: [0, 0], team: 200 }, six);
    expect(score(h)).toEqual([480, 0, 0, 0, 0, 0]);
  });

  it('missed: the team gets 0 whatever its slots, each defender gets the bid', () => {
    expect(score(one({ bidder: 0, bid: 180, team: 175 }))).toEqual([0, 0, 180, 180]);
    const g = one({ bidder: 0, bid: 160, called: [AS, KS], playedBy: [0, 3], team: 155 }, six);
    expect(score(g)).toEqual([0, 160, 160, 0, 160, 160]);
  });

  it('the bidding team sweeping 250 gets 250 each, never multiplied', () => {
    const g = one({ bidder: 0, bid: 160, called: [AS, KS], playedBy: [0, 3], team: 250 }, six);
    expect(score(g)).toEqual([250, 0, 0, 250, 0, 0]);
    expect(result(g.hands[0], g.rules)).toEqual({ made: true, sweep: 'bidders' });
  });

  it('two decks: a sweep is 500 each', () => {
    const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const g = one({ bidder: 2, bid: 400, team: 500 }, seven);
    expect(score(g)).toEqual([0, 0, 500, 500, 500, 0, 0]);
    const d = one({ bidder: 2, bid: 400, team: 0 }, seven);
    expect(score(d)).toEqual([500, 500, 0, 0, 0, 500, 500]);
  });

  it('the defenders sweeping (bidding team took 0) get 250 each', () => {
    const g = one({ bidder: 1, bid: 200, team: 0 });
    expect(score(g)).toEqual([250, 0, 0, 250]);
    expect(result(g.hands[0], g.rules)).toEqual({ made: false, sweep: 'defenders' });
  });

  it('a bid of 250 that takes everything is scored as a sweep', () => {
    const g = one({ bidder: 0, bid: 250, called: [AS, KS], playedBy: [0, 2], team: 250 }, six);
    expect(score(g)).toEqual([250, 0, 250, 0, 0, 0]);
    expect(result(g.hands[0], g.rules)).toEqual({ made: true, sweep: 'bidders' });
    const m = one({ bidder: 0, bid: 250, team: 245 });
    expect(score(m)).toEqual([0, 0, 250, 250]);
    expect(result(m.hands[0], m.rules)).toEqual({ made: false, sweep: 'none' });
  });

  it('no score until the points are in', () => {
    const g = one({ bidder: 0, bid: 180, phase: 'result' });
    expect(result(g.hands[0], g.rules)).toBe(null);
    expect(score(g)).toEqual([0, 0, 0, 0]);
  });
});

describe('§2.4 entering the points', () => {
  it('either side’s points give the bidding team’s', () => {
    expect(teamPointsFrom(60, 'defenders', 250)).toBe(190);
    expect(teamPointsFrom(190, 'bidders', 250)).toBe(190);
    expect(teamPointsFrom(0, 'defenders', 250)).toBe(250);
    expect(teamPointsFrom(250, 'defenders', 250)).toBe(0);
    expect(teamPointsFrom(120, 'defenders', 500)).toBe(380);
  });

  it('the worked examples: bid 180, defenders took 60 / 0 / 250', () => {
    const at = (def: number) =>
      one({ bidder: 0, bid: 180, team: teamPointsFrom(def, 'defenders', 250) });
    expect(result(at(60).hands[0], at(60).rules)).toEqual({ made: true, sweep: 'none' });
    expect(result(at(0).hands[0], at(0).rules)).toEqual({ made: true, sweep: 'bidders' });
    expect(result(at(250).hands[0], at(250).rules)).toEqual({ made: false, sweep: 'defenders' });
  });

  it('shows back the number the table entered', () => {
    const d = one({ bidder: 0, bid: 180, team: 190 });
    expect(enteredPoints(d.hands[0], d.rules)).toBe(60);
    const b = one({ bidder: 0, bid: 180, team: 190, countedBy: 'bidders' });
    expect(enteredPoints(b.hands[0], b.rules)).toBe(190);
    const n = one({ bidder: 0, bid: 180, phase: 'result' });
    expect(enteredPoints(n.hands[0], n.rules)).toBe(null);
  });
});

describe('§2.5 totals, standings and game length', () => {
  const game = (length: 'endless' | 'to1000', hands: KitHand[]) =>
    kitGame({ id: 'x', players: ['a', 'b', 'c', 'd'], start: T0, length, hands });

  it('totals add up the done hands only', () => {
    const g = game('endless', [
      { bidder: 0, bid: 180, team: 190 },
      { bidder: 2, bid: 200, team: 150 },
      { bidder: 1, bid: 160, phase: 'playing' },
    ]);
    expect(totals(g)).toEqual({ p0: 380, p1: 380, p2: 0, p3: 0 });
    expect(totals(g, g.hands.slice(0, 1))).toEqual({ p0: 180, p1: 180, p2: 0, p3: 0 });
  });

  it('standings share a place on a tie and keep seat order', () => {
    const g = game('endless', [{ bidder: 2, bid: 180, team: 190 }]);
    expect(standings(g).map((s) => [s.p.id, s.t, s.rank])).toEqual([
      ['p2', 180, 1],
      ['p3', 180, 1],
      ['p0', 0, 3],
      ['p1', 0, 3],
    ]);
  });

  it('endless never ends by itself', () => {
    const g = game(
      'endless',
      Array.from({ length: 6 }, () => ({ bidder: 0, bid: 250, team: 250 })),
    );
    expect(totals(g).p0).toBe(1500);
    expect(gameOver(g)).toBe(false);
  });

  it('first to 1000 ends after the hand in which someone reaches 1000', () => {
    const hands = Array.from({ length: 4 }, () => ({ bidder: 0, bid: 245, team: 245 }));
    expect(gameOver(game('to1000', hands))).toBe(false);
    expect(totals(game('to1000', hands)).p0).toBe(980);
    const more = [...hands, { bidder: 2, bid: 150, team: 150 }];
    expect(gameOver(game('to1000', more))).toBe(false);
    expect(gameOver(game('to1000', [...more, { bidder: 0, bid: 150, team: 150 }]))).toBe(true);
    expect(gameOver(game('to1000', [...hands, { bidder: 1, bid: 150, team: 150 }]))).toBe(true);
  });

  it('a hand in play doesn’t end the game', () => {
    const g = game('to1000', [
      ...Array.from({ length: 4 }, () => ({ bidder: 0, bid: 245, team: 245 })),
      { bidder: 0, bid: 250, team: 250, phase: 'result' as const },
    ]);
    expect(gameOver(g)).toBe(false);
  });
});

describe('§9 scoring properties', () => {
  it('nobody negative; a miss pays only defenders; a sweep pays exactly the total; slots multiply only a made bid', () => {
    const next = rng(4242);
    let sweeps = 0,
      misses = 0,
      multi = 0;
    for (let k = 0; k < 3000; k++) {
      const n = 4 + (k % 7);
      const players = Array.from({ length: n }, (_, i) => 'x' + i);
      const probe = kitGame({ id: 'x', players, start: T0, hands: [] });
      const total = deckTotal(probe.rules.decks);
      const bidder = Math.floor(next() * n);
      const bid =
        probe.rules.minBid + 5 * Math.floor(next() * ((total - probe.rules.minBid) / 5 + 1));
      const partners = probe.rules.partners;
      const playedBy = Array.from({ length: partners }, () =>
        next() < 0.25 ? bidder : Math.floor(next() * n),
      );
      const r = next();
      const pts = r < 0.1 ? 0 : r < 0.2 ? total : 5 * Math.floor(next() * (total / 5 + 1));
      const g = one({ bidder, bid, playedBy, team: pts }, players);
      const h = g.hands[0];
      const s = handScore(
        h,
        g.rules,
        g.players.map((p) => p.id),
      );
      const tm = new Set(team(h)),
        sl = slots(h);
      const res = result(h, g.rules)!;
      for (const p of g.players) {
        const v = s[p.id];
        expect(v).toBeGreaterThanOrEqual(0);
        if (res.sweep === 'bidders') expect(v).toBe(tm.has(p.id) ? total : 0);
        else if (res.sweep === 'defenders') expect(v).toBe(tm.has(p.id) ? 0 : total);
        else if (res.made) expect(v).toBe(tm.has(p.id) ? bid * sl[p.id] : 0);
        else expect(v).toBe(tm.has(p.id) ? 0 : bid);
      }
      if (res.sweep !== 'none') sweeps++;
      if (!res.made) misses++;
      if (Object.values(sl).some((x) => x > 1)) multi++;
      expect(res.made).toBe(pts >= bid);
      expect(res.sweep).toBe(pts === total ? 'bidders' : pts === 0 ? 'defenders' : 'none');
    }
    expect(Math.min(sweeps, misses, multi)).toBeGreaterThan(100);
  });
});
