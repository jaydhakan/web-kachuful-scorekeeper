import { rng } from './__fixtures__/kit';
import {
  auction,
  defaultRules,
  deckTotal,
  nextBid,
  validBid,
  validCall,
  type Call,
  type KtRules,
} from './index';

const ORDER = ['a', 'b', 'c', 'd'];
const R = defaultRules(4);
const bid = (playerId: string, b: number): Call => ({ playerId, bid: b });
const pass = (playerId: string): Call => ({ playerId, pass: true });
const forced = (playerId: string, f: number): Call => ({ playerId, forced: f });
const run = (calls: Call[], rules: KtRules = R, order = ORDER) => auction(calls, order, rules);

describe('§2.2 the auction', () => {
  it('starts with the first speaker and no high bid', () => {
    expect(run([])).toEqual({
      high: null,
      holder: null,
      toSpeak: 'a',
      done: false,
      forcedTo: null,
      invalidAt: null,
    });
  });

  it('goes round in turn; a call out of turn is refused', () => {
    expect(run([bid('a', 150)]).toSpeak).toBe('b');
    expect(run([bid('b', 150)]).invalidAt).toBe(0);
    expect(run([pass('a'), pass('c')]).invalidAt).toBe(1);
  });

  it('a bid is at least the minimum, a multiple of the step and at most the deck total', () => {
    expect(run([bid('a', 145)]).invalidAt).toBe(0);
    expect(run([bid('a', 152)]).invalidAt).toBe(0);
    expect(run([bid('a', 255)]).invalidAt).toBe(0);
    expect(run([bid('a', 250)]).invalidAt).toBe(null);
    expect(run([bid('a', 150.5)]).invalidAt).toBe(0);
    const ten = { ...R, step: 10 as const };
    expect(run([bid('a', 155)], ten).invalidAt).toBe(0);
    expect(run([bid('a', 160)], ten).invalidAt).toBe(null);
  });

  it('a bid must beat the current high bid', () => {
    expect(run([bid('a', 160), bid('b', 160)]).invalidAt).toBe(1);
    expect(run([bid('a', 160), bid('b', 155)]).invalidAt).toBe(1);
    expect(run([bid('a', 160), bid('b', 165)])).toMatchObject({ high: 165, holder: 'b' });
  });

  it('ends when every other player has passed in a row since the last bid', () => {
    const calls = [bid('a', 150), pass('b'), pass('c')];
    expect(run(calls)).toMatchObject({ done: false, toSpeak: 'd', high: 150, holder: 'a' });
    expect(run([...calls, pass('d')])).toMatchObject({
      done: true,
      toSpeak: null,
      high: 150,
      holder: 'a',
    });
  });

  it('a player who passed may bid again when their turn comes round', () => {
    const calls = [
      bid('a', 150),
      pass('b'),
      pass('c'),
      bid('d', 160),
      pass('a'),
      bid('b', 170),
      pass('c'),
      pass('d'),
    ];
    expect(run(calls)).toMatchObject({ done: false, toSpeak: 'a', high: 170, holder: 'b' });
    expect(run([...calls, pass('a')])).toMatchObject({ done: true, high: 170, holder: 'b' });
  });

  it('a bid of the whole deck still needs the others to pass', () => {
    const calls = [pass('a'), bid('b', 250), pass('c'), pass('d')];
    expect(run(calls)).toMatchObject({ done: false, toSpeak: 'a' });
    expect(run([...calls, bid('a', 255)]).invalidAt).toBe(4);
    expect(run([...calls, pass('a')])).toMatchObject({ done: true, high: 250, holder: 'b' });
  });

  it('nobody bid and everyone passed: the first speaker must take it at the minimum', () => {
    const all = ORDER.map(pass);
    expect(run(all)).toMatchObject({ done: false, forcedTo: 'a', toSpeak: 'a', high: null });
    expect(run([...all, pass('a')]).invalidAt).toBe(4);
    expect(run([...all, bid('a', 160)]).invalidAt).toBe(4);
    expect(run([...all, forced('a', 155)]).invalidAt).toBe(4);
    expect(run([...all, forced('b', 150)]).invalidAt).toBe(4);
    expect(run([...all, forced('a', 150)])).toEqual({
      high: 150,
      holder: 'a',
      toSpeak: null,
      done: true,
      forcedTo: null,
      invalidAt: null,
    });
  });

  it('the forced minimum is the table’s own minimum (350 with two decks)', () => {
    const order = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const r = defaultRules(7);
    const all = order.map(pass);
    expect(auction([...all, forced('a', 350)], order, r)).toMatchObject({
      done: true,
      high: 350,
    });
  });

  it('a forced call is refused while anyone could still bid', () => {
    expect(run([forced('a', 150)]).invalidAt).toBe(0);
    expect(run([pass('a'), pass('b'), pass('c'), forced('d', 150)]).invalidAt).toBe(3);
  });

  it('nothing is accepted after the auction is over', () => {
    const done = [bid('a', 150), pass('b'), pass('c'), pass('d')];
    expect(run([...done, pass('a')]).invalidAt).toBe(4);
    const r = run([...done, pass('a'), bid('b', 200)]);
    expect(r).toMatchObject({ invalidAt: 4, high: 150, holder: 'a', done: true });
  });

  it('validCall checks the next call against the auction so far', () => {
    expect(validCall([], ORDER, R, bid('a', 150))).toBe(true);
    expect(validCall([], ORDER, R, bid('b', 150))).toBe(false);
    expect(validCall([bid('a', 150)], ORDER, R, pass('b'))).toBe(true);
    expect(validCall([bid('a', 150)], ORDER, R, bid('b', 150))).toBe(false);
    expect(validCall([bid('b', 150)], ORDER, R, pass('a'))).toBe(false);
  });

  it('nextBid is the smallest legal bid, or null when nobody can bid', () => {
    expect(nextBid(run([]), R)).toBe(150);
    expect(nextBid(run([bid('a', 180)]), R)).toBe(185);
    expect(nextBid(run([bid('a', 180)]), { ...R, step: 10 })).toBe(190);
    expect(nextBid(run([bid('a', 250)]), R)).toBe(null);
    expect(nextBid(run(ORDER.map(pass)), R)).toBe(null);
  });
});

describe('§2.2 quick mode', () => {
  it('records any amount from the minimum up to the total, in steps', () => {
    expect(validBid(150, R)).toBe(true);
    expect(validBid(250, R)).toBe(true);
    expect(validBid(145, R)).toBe(false);
    expect(validBid(255, R)).toBe(false);
    expect(validBid(152, R)).toBe(false);
    expect(validBid(155, { ...R, step: 10 })).toBe(false);
    expect(validBid(Number.NaN, R)).toBe(false);
    expect(validBid(350, defaultRules(9))).toBe(true);
    expect(validBid(500, defaultRules(9))).toBe(true);
    expect(validBid(345, defaultRules(9))).toBe(false);
  });
});

describe('§9 auction properties', () => {
  /** Random legal auctions across every table size, both steps and several minimums. */
  function* auctions() {
    const next = rng(20261109);
    for (let k = 0; k < 600; k++) {
      const n = 4 + (k % 7);
      const order = Array.from({ length: n }, (_, i) => 's' + i);
      const base = defaultRules(n);
      const step = k % 3 === 0 ? 10 : 5;
      const total = deckTotal(base.decks);
      const minBid = k % 5 === 0 ? total - 50 : base.minBid;
      const rules: KtRules = { ...base, step, minBid };
      const passRate = [0.3, 0.6, 0.9, 1][k % 4];
      const calls: Call[] = [];
      let s = auction(calls, order, rules);
      for (let guard = 0; !s.done && guard < 5000; guard++) {
        const who = s.toSpeak!;
        const nb = nextBid(s, rules);
        let c: Call;
        if (s.forcedTo) c = { playerId: who, forced: rules.minBid };
        else if (nb == null || next() < passRate) c = { playerId: who, pass: true };
        else c = { playerId: who, bid: Math.min(total, nb + step * Math.floor(next() * 4)) };
        calls.push(c);
        s = auction(calls, order, rules);
      }
      yield { order, rules, calls, s };
    }
  }

  it('always ends, with the highest bid winning and no illegal call', () => {
    for (const { calls, s, rules } of auctions()) {
      expect(s.done).toBe(true);
      expect(s.invalidAt).toBe(null);
      const bids = calls.flatMap((c) => ('bid' in c ? [c.bid] : []));
      expect(s.high).toBe(bids.length ? Math.max(...bids) : rules.minBid);
      const last = calls.filter((c) => 'bid' in c || 'forced' in c).at(-1)!;
      expect(s.holder).toBe(last.playerId);
    }
  });

  it('ends exactly when everyone else has passed in a row', () => {
    for (const { calls, order, s } of auctions()) {
      if (calls.some((c) => 'forced' in c)) continue;
      const tail = calls.slice(-(order.length - 1));
      expect(tail.every((c) => 'pass' in c)).toBe(true);
      expect(tail.map((c) => c.playerId)).not.toContain(s.holder);
    }
  });

  it('forces the minimum only when nobody bid, and only on the first speaker', () => {
    let seen = 0;
    for (const { calls, order, rules } of auctions()) {
      const f = calls.filter((c) => 'forced' in c);
      if (calls.some((c) => 'bid' in c)) expect(f).toHaveLength(0);
      else {
        seen++;
        expect(calls).toHaveLength(order.length + 1);
        expect(f).toEqual([{ playerId: order[0], forced: rules.minBid }]);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('lets players back in after a pass', () => {
    let reentries = 0;
    for (const { calls } of auctions()) {
      const passed = new Set<string>();
      for (const c of calls) {
        if ('pass' in c) passed.add(c.playerId);
        else if ('bid' in c && passed.has(c.playerId)) reentries++;
      }
    }
    expect(reentries).toBeGreaterThan(50);
  });

  it('refuses any call that is not the next speaker’s', () => {
    for (const { calls, order, rules } of [...auctions()].slice(0, 100)) {
      for (let i = 0; i < calls.length; i++) {
        const s = auction(calls.slice(0, i), order, rules);
        const other = order.find((p) => p !== s.toSpeak)!;
        expect(validCall(calls.slice(0, i), order, rules, { playerId: other, pass: true })).toBe(
          false,
        );
      }
    }
  });
});
