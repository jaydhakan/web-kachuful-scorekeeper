import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { botMove, guessBid, seeded } from './__fixtures__/bot';
import {
  NEWCOMER,
  SUIT_DEAL,
  T0,
  WHO,
  card,
  cards,
  drawFor,
  kitGame,
  rulesWith,
  type KitEntry,
  type Table,
} from './__fixtures__/kit';
import { allowedBids, bidProblem, minBidFor } from './bidding';
import { cardId, dealSeeded, drawWinner } from './cards';
import { legalPlays, playProblem } from './legal';
import { applyAction, newTable, rematchTable, setRules, sit, type NewTable } from './rules';
import { scoreHand } from './scoring';
import { SEATS } from './seats';
import { endResult, gameOver, handLines, totals } from './standings';
import { tableHand } from './table';
import { timeoutPlay } from './timer';
import { trickWinner } from './trick';
import { validate } from './validate';
import { viewFor } from './view';
import type {
  Action,
  Actor,
  ApplyCtx,
  Card,
  Play,
  Seat,
  SpGame,
  SpHand,
  SpPublic,
  SpRules,
  SpWho,
} from './types';

/**
 * Spades' golden fixtures for the backend (contract/README.md): online tables replayed step by step with each step's
 * result, the final state, hands and what each viewer is sent (`Golden.views`); plus case tables for scoring,
 * legality and upload checks.
 * `EXPORT_FIXTURES=1 npx vitest run src/games/spades/domain/fixtures.export.test.ts` rewrites
 * contract/fixtures/spades-*.json.
 */
const DIR = path.resolve(import.meta.dirname, '../../../../contract/fixtures');

/** JSON with anything short kept on one line, so a card or a step's result is one line. */
function pretty(x: unknown, pad = ''): string {
  const flat = JSON.stringify(x);
  if (x === null || typeof x !== 'object' || flat.length + pad.length <= 200) return flat;
  const inner = pad + '  ';
  if (Array.isArray(x))
    return `[\n${x.map((v) => inner + pretty(v ?? null, inner)).join(',\n')}\n${pad}]`;
  const rows = Object.entries(x).filter(([, v]) => v !== undefined);
  return `{\n${rows.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${pretty(v, inner)}`).join(',\n')}\n${pad}}`;
}

function write(name: string, out: unknown) {
  const file = path.join(DIR, `spades-${name}.json`);
  const text = pretty(out) + '\n';
  if (process.env.EXPORT_FIXTURES) writeFileSync(file, text);
  expect(existsSync(file), `${file} is missing: run with EXPORT_FIXTURES=1`).toBe(true);
  expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(JSON.parse(text));
}

type Ctx = Pick<ApplyCtx, 'draw' | 'deal' | 'rev' | 'lastSeenAt'>;
const VIEWERS = [0, 1, 2, 3, null] as const;
type Choose = (hand: Card[], trick: Play[], broken: boolean, rnd: () => number) => Card;
const firstLegal: Choose = (h, t, b) => legalPlays(h, t, b)[0];
const randomLegal: Choose = (h, t, b, rnd) => {
  const legal = legalPlays(h, t, b);
  return legal[Math.floor(rnd() * legal.length)];
};

/**
 * Records a table as it is played. A step is a `sit` (the join route or an accepted seat invite), `setRules` (the
 * rules route), an `action` with its server context (the mirror passes the current hands itself), or `rematch`
 * (`rematchTable` on the finished table, which the following steps then play).
 */
class Golden {
  t: Table;
  readonly setup: NewTable;
  readonly steps: unknown[] = [];
  readonly rnd: () => number;

  constructor(rules: Partial<SpRules> = {}, seed = 1) {
    this.setup = {
      id: `70000000-0000-4000-8000-${String(seed).padStart(12, '0')}`,
      code: 'KQ7M',
      name: "Riya's table",
      rules: rulesWith(rules),
      host: WHO[0],
      now: T0,
    };
    this.t = { state: newTable(this.setup), hands: null, now: T0 };
    this.rnd = seeded(seed);
  }

  private summary(s: SpPublic) {
    return { rev: s.rev, status: s.status, phase: s.phase, turn: s.turn, deadline: s.deadline };
  }

  /** Per viewer (seats 0–3, then null): `me`, and `blind`, the one field of the table `viewFor` changes. */
  views() {
    return VIEWERS.map((v) => {
      const { me, table } = viewFor(this.t.state, this.t.hands, v, this.t.now);
      return { me, blind: table.blind };
    });
  }

  get s() {
    return this.t.state;
  }

  sit(who: SpWho, seat?: Seat, dt = 1000) {
    const at = this.t.now + dt;
    const r = sit(this.t.state, who, seat, at);
    this.t = { ...this.t, state: r.state, now: at };
    const res = r.ok ? { ok: true } : { ok: false, error: r.error };
    this.steps.push({
      at,
      sit: { who, seat: seat ?? null },
      expect: { ...res, ...this.summary(r.state) },
    });
    return this;
  }

  rules(actor: Actor, rules: SpRules, name?: string, dt = 1000) {
    const at = this.t.now + dt;
    const r = setRules(this.t.state, actor, rules, name, at);
    this.t = { ...this.t, state: r.state, now: at };
    const res = r.ok ? { ok: true } : { ok: false, error: r.error };
    this.steps.push({
      at,
      setRules: { actor, rules, name: name ?? null },
      expect: { ...res, ...this.summary(r.state) },
    });
    return this;
  }

  act(actor: Actor, action: Action, ctx: Partial<Ctx> = {}, dt = 1000, views = false) {
    const at = this.t.now + dt;
    const r = applyAction(this.t.state, action, actor, { now: at, hands: this.t.hands, ...ctx });
    this.t = { state: r.state, hands: r.hands, now: at };
    const res = r.ok ? { ok: true, noop: r.noop } : { ok: false, error: r.error };
    this.steps.push({
      at,
      actor,
      action,
      ...(Object.keys(ctx).length > 0 && { ctx }),
      expect: { ...res, ...this.summary(r.state), ...(views && { views: this.views() }) },
    });
    return r;
  }

  rematch(swap: boolean, dt = 1000) {
    const at = this.t.now + dt;
    const id = this.s.next as string;
    const state = rematchTable(this.s, { id, code: 'RM4X', now: at, swap });
    this.t = { state, hands: null, now: at };
    this.steps.push({
      at,
      rematch: { id, code: 'RM4X', swap },
      expect: { ok: true, ...this.summary(state) },
    });
  }

  /** The other three join, everyone is ready, the draw goes to `dealer` and the deal is made. */
  start(dealer: Seat, deal: Card[][] = SUIT_DEAL) {
    for (const w of WHO.slice(1)) this.sit(w);
    for (const s of SEATS) this.act(s, { type: 'ready' });
    this.act(0, { type: 'drawForDeal' }, { draw: drawFor(dealer) });
    this.act(dealer, { type: 'deal' }, { deal });
    return this;
  }

  deal(deal: Card[][] = SUIT_DEAL) {
    this.act(this.s.dealer as Seat, { type: 'deal' }, { deal });
  }

  /** Each bid in turn, looking first when the gate is up. */
  bid(...bids: number[]) {
    for (const b of bids) {
      const seat = this.s.turn as Seat;
      if (!this.s.looked[seat]) this.act(seat, { type: 'look' });
      this.act(seat, { type: 'bid', bid: b });
    }
  }

  /** Plays `n` cards (all of the hand by default). */
  play(choose: Choose = firstLegal, n = 52) {
    for (let i = 0; i < n && this.s.status === 'playing' && this.s.phase === 'playing'; i++) {
      const seat = this.s.turn as Seat;
      const hand = (this.t.hands as Card[][])[seat];
      this.act(seat, { type: 'play', card: choose(hand, this.s.trick, this.s.broken, this.rnd) });
    }
  }

  out(name: string) {
    const s = this.s;
    return {
      kind: 'spades-online',
      name,
      setup: this.setup,
      steps: this.steps,
      expect: {
        state: s,
        hands: this.t.hands,
        views: this.views(),
        totals: totals(s.history),
        lines: handLines(s.history),
      },
    };
  }
}

/** Sensible play on seeded deals until the game ends (or `maxHands`). */
function classic(): Golden {
  const g = new Golden({}, 11).start(1, dealSeeded(1101));
  let k = 1;
  while (g.s.status === 'playing' && g.s.history.length < 15) {
    if (g.s.phase === 'deal' || g.s.phase === 'handEnd') g.deal(dealSeeded(1101 + k++));
    else if (g.s.phase === 'bidding') {
      const seat = g.s.turn as Seat;
      const allowed = allowedBids(seat, g.s.bids, g.s.rules);
      const want = guessBid((g.t.hands as Card[][])[seat]);
      g.bid(allowed.includes(want) ? want : allowed[1]);
    } else g.play(randomLegal, 4);
  }
  return g;
}

/** Blind Nil declared early and withheld; a Nil and a Blind Nil made; seat 0 holds every spade. */
function nilBlind(): Golden {
  const g = new Golden({ blindNil: true }, 12);
  for (const w of WHO.slice(1)) g.sit(w);
  for (const s of SEATS) g.act(s, { type: 'ready' });
  g.act(0, { type: 'drawForDeal' }, { draw: drawFor(3) });
  g.act(3, { type: 'deal' }, { deal: SUIT_DEAL }, 1000, true);
  g.act(0, { type: 'bid', bid: 5 });
  g.act(2, { type: 'blindNil' }, {}, 1000, true);
  g.act(2, { type: 'look' });
  g.act(0, { type: 'look' }, {}, 1000, true);
  g.act(0, { type: 'bid', bid: 5 });
  g.act(1, { type: 'look' });
  g.act(1, { type: 'blindNil' });
  g.act(1, { type: 'bid', bid: 0 }, {}, 1000, true);
  g.act(2, { type: 'look' });
  g.act(3, { type: 'look' });
  g.act(3, { type: 'bid', bid: 2 }, {}, 1000, true);
  g.play();
  return g;
}

/** All 13 to seat 0 each hand while team a underbids: two 10-bag penalties, then the host ends it. */
function bagPenalty(): Golden {
  const g = new Golden({ target: 300 }, 13).start(3);
  g.bid(1, 1, 1, 1);
  g.play();
  g.deal();
  g.bid(1, 3, 1, 3);
  g.play();
  g.deal();
  g.bid(4, 1, 4, 1);
  g.play();
  g.act(0, { type: 'endGame' });
  return g;
}

/** Team b overbids twice and drops below −200. */
function mercy(): Golden {
  const g = new Golden({ mercy: -200, target: 500 }, 14).start(3);
  g.bid(4, 6, 4, 6);
  g.play();
  g.deal();
  g.bid(6, 4, 6, 4);
  g.play();
  return g;
}

function endGame(): Golden {
  const g = new Golden({}, 15).start(3);
  g.bid(5, 0, 3, 2);
  g.play();
  g.deal();
  g.bid(3);
  g.act(1, { type: 'endGame' });
  g.act(0, { type: 'endGame' });
  return g;
}

function endLevel(): Golden {
  const g = new Golden({}, 16).start(2, dealSeeded(1601));
  g.bid(3, 4);
  g.act(0, { type: 'endGame' });
  return g;
}

function drawGame(): Golden {
  const g = new Golden({ target: null }, 17).start(3);
  g.bid(5, 0, 3, 2);
  g.play();
  g.act(2, { type: 'drawGame' });
  g.act(0, { type: 'drawGame' });
  g.act(1, { type: 'react', emoji: '👏' });
  return g;
}

function cancelGame(): Golden {
  const g = new Golden({}, 18).start(0, dealSeeded(1801));
  g.bid(2, 3);
  g.act(0, { type: 'cancelGame' });
  g.act(1, { type: 'bid', bid: 3 });
  g.act(2, { type: 'timeout' }, {}, 60_000);
  g.act(3, { type: 'react', emoji: '😬' });
  g.act(0, { type: 'rematch', id: '70000000-0000-4000-8000-000000000099' });
  g.rematch(false);
  g.act(0, { type: 'cancelGame' });
  return g;
}

/** The 30 s timer, the gate, a stale timeout, away and the 5 s timer, back again, then Replace. */
function timeouts(): Golden {
  const g = new Golden({ blindNil: true }, 19).start(3);
  const rev = g.s.rev;
  g.act(2, { type: 'timeout' }, { rev }, 29_000);
  g.act(2, { type: 'timeout' }, { rev }, 1500, true);
  g.act(3, { type: 'timeout' }, { rev }, 10);
  g.bid(3, 3, 4);
  g.act(1, { type: 'timeout' }, { rev: g.s.rev }, 31_000);
  g.play(firstLegal, 3);
  g.act(3, { type: 'timeout' }, {}, 4000);
  g.act(3, { type: 'timeout' }, {}, 1000);
  g.play(firstLegal, 3);
  g.act(0, { type: 'ready' }, {}, 500, true);
  g.play(firstLegal, 1);
  g.act(2, { type: 'timeout' }, {}, 31_000);
  g.play(firstLegal, 2);
  g.play(firstLegal, 1);
  g.act(2, { type: 'timeout' }, {}, 31_000);
  g.act(0, { type: 'replace', seat: 1 });
  g.play(firstLegal, 2);
  g.act(1, { type: 'replace', seat: 1 });
  g.act(0, { type: 'replace', seat: 1 }, {}, 1000, true);
  g.act(0, { type: 'play', card: card('7s') });
  g.act(2, { type: 'timeout' }, {}, 60_000);
  g.sit(NEWCOMER, 1);
  g.play();
  g.act(0, { type: 'cancelGame' });
  return g;
}

/** With the timer off, only a seat unseen for 60 s can be timed out. */
function timerOff(): Golden {
  const g = new Golden({ timerSec: null }, 20).start(3);
  const start = g.s.turnStartedAt as number;
  g.act(2, { type: 'timeout' }, { lastSeenAt: start + 500 }, 1000);
  g.act(2, { type: 'timeout' }, { lastSeenAt: start - 120_000 }, 58_000);
  g.act(2, { type: 'timeout' }, { lastSeenAt: start - 120_000 }, 1000);
  g.bid(3, 3, 3);
  g.act(3, { type: 'timeout' }, { lastSeenAt: null }, 600_000);
  g.act(3, { type: 'timeout' }, { lastSeenAt: g.s.turnStartedAt as number }, 1000);
  g.play(firstLegal, 4);
  g.act(0, { type: 'drawGame' });
  return g;
}

/** Seats, rules, ready, shuffle, the draw, a late deal, a draw, and a swapped rematch. */
function lobby(): Golden {
  const g = new Golden({}, 21);
  g.sit(WHO[1]);
  g.sit(WHO[2], 3);
  g.sit(WHO[1], 2);
  g.sit(WHO[3]);
  g.sit(NEWCOMER);
  g.sit(WHO[3], 2);
  g.sit(WHO[1]);
  g.rules(1, rulesWith({ target: 300 }));
  g.rules(0, rulesWith({ target: 55 }));
  g.rules(0, rulesWith({ nil: false, blindNil: true }));
  g.rules(0, rulesWith(), 'x'.repeat(41));
  g.rules(0, rulesWith({ target: 300, blindNil: true, minTeamBid: 4 }), '  Friday table ');
  for (let i = 0; i < 3; i++) g.act(0, { type: 'shufflePartners' });
  g.act(1, { type: 'shufflePartners' });
  for (const s of [0, 1, 2] as Seat[]) g.act(s, { type: 'ready' });
  g.act(0, { type: 'drawForDeal' }, { draw: drawFor(0) });
  g.act(3, { type: 'ready' });
  g.act(3, { type: 'unready' });
  g.act(3, { type: 'unready' });
  g.act(3, { type: 'ready' });
  g.act(1, { type: 'drawForDeal' }, { draw: drawFor(0) });
  g.act(0, { type: 'drawForDeal' }, { draw: cards('Kd Kh 3c Kd') });
  g.act(0, { type: 'drawForDeal' }, { draw: cards('Kd Kh 3c Kc') });
  g.sit(NEWCOMER);
  g.rules(0, rulesWith());
  g.act(0, { type: 'deal' }, { deal: SUIT_DEAL });
  g.act(1, { type: 'deal' }, { deal: SUIT_DEAL.map((h) => h.slice(1)) });
  g.act(0, { type: 'deal' }, { deal: SUIT_DEAL }, 16_000, true);
  g.act(0, { type: 'drawGame' });
  g.act(1, { type: 'rematch', id: '70000000-0000-4000-8000-000000000098' });
  g.act(0, { type: 'rematch', id: '70000000-0000-4000-8000-000000000098', swap: true });
  g.act(0, { type: 'rematch', id: '70000000-0000-4000-8000-000000000097' });
  g.rematch(true);
  g.act(1, { type: 'ready' });
  return g;
}

/** Refusals of every kind, under Nil off and a minimum team bid. */
function errors(): Golden {
  const g = new Golden({ nil: false, minTeamBid: 4 }, 22);
  g.act(null, { type: 'ready' });
  g.act(0, { type: 'bid', bid: 3 });
  g.act(0, { type: 'endGame' });
  g.start(3, dealSeeded(2201));
  const hand = (s: Seat) => (g.t.hands as Card[][])[s];
  g.act(0, { type: 'play', card: hand(0)[0] });
  g.act(1, { type: 'bid', bid: 3 });
  g.act(null, { type: 'bid', bid: 3 });
  g.act(0, { type: 'blindNil' });
  g.act(0, { type: 'bid', bid: 0 });
  g.act(0, { type: 'bid', bid: 14 });
  g.act(0, { type: 'bid', bid: 2.5 });
  g.act(0, { type: 'bid', bid: 1 });
  g.act(1, { type: 'bid', bid: 2 });
  g.act(2, { type: 'bid', bid: 2 });
  g.act(2, { type: 'bid', bid: 3 });
  g.act(3, { type: 'bid', bid: 1 });
  g.act(3, { type: 'bid', bid: 2 });
  g.act(0, { type: 'bid', bid: 2 });
  g.act(0, { type: 'look' });
  g.act(0, { type: 'play', card: { rank: '1', suit: 'stars' } as unknown as Card });
  g.act(0, { type: 'play', card: hand(1)[0] });
  const spade = hand(0).find((c) => c.suit === 'spades');
  if (spade) g.act(0, { type: 'play', card: spade });
  g.play(firstLegal, 1);
  const led = g.s.trick[0].card.suit;
  const off = hand(1).find((c) => c.suit !== led);
  if (off) g.act(1, { type: 'play', card: off });
  g.act(1, { type: 'react', emoji: 'x' });
  g.act(1, { type: 'react', emoji: '🔥' });
  g.act(null, { type: 'react', emoji: '🔥' });
  g.act(0, { type: 'replace', seat: 9 as Seat });
  g.act(0, { type: 'replace', seat: 1 });
  g.act(0, { type: 'replace', seat: 0 });
  g.act(0, { type: 'rematch', id: 'x' });
  g.act(1, { type: 'endGame' });
  g.act(0, { type: 'unready' });
  g.act(0, { type: 'shufflePartners' });
  g.act(0, { type: 'drawForDeal' }, { draw: drawFor(0) });
  g.act(0, { type: 'deal' }, { deal: SUIT_DEAL });
  g.act(0, { type: 'endGame' });
  g.act(1, { type: 'bid', bid: 3 });
  g.act(2, { type: 'timeout' });
  g.act(1, { type: 'react', emoji: '🙏' });
  return g;
}

/** Seeded noisy play under varied rules, stopping at the end or after three hands. */
function random(seed: number): Golden {
  const rules: Partial<SpRules> = {
    target: [100, 200, null][seed % 3],
    timerSec: ([30, 60, null] as const)[seed % 3],
    blindNil: seed % 2 === 1,
    minTeamBid: seed % 4 === 3 ? 4 : null,
    mercy: seed % 5 === 2 ? -200 : null,
  };
  const g = new Golden(rules, seed);
  for (const w of WHO.slice(1)) g.sit(w);
  const rnd = seeded(seed * 7919);
  let deals = 0;
  for (let n = 0; n < 2000 && g.s.status !== 'finished' && g.s.history.length < 3; n++) {
    const m = botMove(g.t, rnd, seed, deals);
    const r = g.act(m.actor, m.action, m.ctx as Partial<Ctx>, m.dt);
    if (r.ok && !r.noop && m.action.type === 'deal') deals++;
  }
  return g;
}

const GAMES: Array<[string, () => Golden]> = [
  ['classic', classic],
  ['nil-blind', nilBlind],
  ['bag-penalty', bagPenalty],
  ['mercy', mercy],
  ['end-game', endGame],
  ['end-level', endLevel],
  ['draw-game', drawGame],
  ['cancel-game', cancelGame],
  ['timeouts', timeouts],
  ['timer-off', timerOff],
  ['lobby', lobby],
  ['errors', errors],
  ['random-7', () => random(7)],
  ['random-19', () => random(19)],
  ['random-42', () => random(42)],
];

describe('Spades golden games', () => {
  for (const [name, play] of GAMES) it(name, () => write(name, play().out(name)));

  it('cover what they are named for', () => {
    const end = (f: () => Golden) => f().s;
    expect(end(classic).result?.endedBy).toBe('target');
    expect(end(nilBlind).history[0].blind).toEqual([false, false, true, false]);
    expect(totals(end(bagPenalty).history).a.penalties).toBe(2);
    expect(end(mercy).result).toEqual({ winner: 'a', endedBy: 'mercy' });
    expect(end(endGame).result).toEqual({ winner: 'a', endedBy: 'end' });
    expect(end(endLevel).result).toEqual({ winner: 'draw', endedBy: 'end' });
    expect(end(drawGame).result).toEqual({ winner: 'draw', endedBy: 'draw' });
    expect(end(cancelGame).status).toBe('cancelled');
    const t = end(timeouts);
    expect(t.history[0].players?.[1]).toBe(NEWCOMER.playerId);
    expect(end(lobby).status).toBe('lobby');
  });
});

const hand = (h: Omit<SpHand, 'index' | 'dealer' | 'phase'>): SpHand => ({
  index: 0,
  dealer: 3,
  phase: 'done',
  ...h,
});
const F = [false, false, false, false];
const N = [null, null, null, null];
const BLIND0 = [true, false, false, false];

describe('Spades case tables', () => {
  it('scoring', () => {
    const one: Array<[string, SpHand, { a: number; b: number }]> = [
      [
        'E1 made exactly',
        hand({ bids: [2, 4, 3, 4], blind: F, teamTricks: [5, 8], nilTricks: N }),
        { a: 0, b: 0 },
      ],
      [
        'E2 made with 2 over',
        hand({ bids: [2, 3, 3, 3], blind: F, teamTricks: [7, 6], nilTricks: N }),
        { a: 0, b: 0 },
      ],
      [
        'E3 set earns no bags',
        hand({ bids: [2, 4, 3, 4], blind: F, teamTricks: [4, 9], nilTricks: N }),
        { a: 0, b: 0 },
      ],
      [
        'E4 Nil made, partner over',
        hand({
          bids: [0, 4, 4, 4],
          blind: F,
          teamTricks: [5, 8],
          nilTricks: [0, null, null, null],
        }),
        { a: 0, b: 0 },
      ],
      [
        'E5 Nil failed, partner made',
        hand({
          bids: [0, 4, 4, 4],
          blind: F,
          teamTricks: [6, 7],
          nilTricks: [2, null, null, null],
        }),
        { a: 0, b: 0 },
      ],
      [
        'E6 Nil failed, partner set, Nil tricks still bags',
        hand({
          bids: [0, 4, 4, 4],
          blind: F,
          teamTricks: [5, 8],
          nilTricks: [2, null, null, null],
        }),
        { a: 0, b: 0 },
      ],
      [
        'E7 Blind Nil made',
        hand({
          bids: [0, 3, 5, 3],
          blind: BLIND0,
          teamTricks: [6, 7],
          nilTricks: [0, null, null, null],
        }),
        { a: 0, b: 0 },
      ],
      [
        'E8 Blind Nil failed',
        hand({
          bids: [0, 3, 5, 3],
          blind: BLIND0,
          teamTricks: [6, 7],
          nilTricks: [1, null, null, null],
        }),
        { a: 0, b: 0 },
      ],
      [
        'both partners Nil',
        hand({ bids: [0, 5, 0, 5], blind: F, teamTricks: [2, 11], nilTricks: [0, null, 2, null] }),
        { a: 0, b: 0 },
      ],
      [
        'both teams Nil, b Blind',
        hand({
          bids: [0, 0, 4, 6],
          blind: [false, true, false, false],
          teamTricks: [4, 9],
          nilTricks: [0, 1, null, null],
        }),
        { a: 3, b: 8 },
      ],
      [
        'the tenth bag',
        hand({ bids: [1, 3, 2, 3], blind: F, teamTricks: [6, 7], nilTricks: N }),
        { a: 9, b: 0 },
      ],
      [
        'two penalties in one hand',
        hand({ bids: [0, 0, 0, 0], blind: F, teamTricks: [13, 0], nilTricks: [13, 0, 0, 0] }),
        { a: 9, b: 19 },
      ],
    ];
    const run = [
      tableHand({ index: 0, dealer: 3, bids: [3, 3, 2, 3], teamA: 7 }),
      tableHand({ index: 1, dealer: 0, bids: [2, 2, 2, 2], teamA: 8 }),
      tableHand({ index: 2, dealer: 1, bids: [3, 2, 3, 2], teamA: 9 }),
      tableHand({ index: 3, dealer: 2, bids: [1, 3, 2, 3], teamA: 6 }),
    ];
    const R = rulesWith();
    const M = rulesWith({ mercy: -200 });
    const E = rulesWith({ target: null });
    const EM = rulesWith({ target: null, mercy: -200 });
    const over: Array<[string, { a: number; b: number }, SpRules]> = [
      ['below the target', { a: 199, b: 150 }, R],
      ['at the target', { a: 200, b: 150 }, R],
      ['both past, higher wins', { a: 205, b: 231 }, R],
      ['tie at the target plays on', { a: 210, b: 210 }, R],
      ['Endless never ends on score', { a: 5000, b: -3000 }, E],
      ['mercy off', { a: -500, b: 20 }, R],
      ['mercy: below −200 loses', { a: 40, b: -210 }, M],
      ['mercy: exactly −200 does not', { a: 40, b: -200 }, M],
      ['mercy in Endless', { a: -250, b: 0 }, EM],
      ['target beats mercy', { a: -230, b: 215 }, M],
      ['both below −200, higher wins', { a: -260, b: -230 }, M],
      ['both below −200, equal plays on', { a: -230, b: -230 }, M],
      ['custom target 250', { a: 250, b: 0 }, rulesWith({ target: 250 })],
    ];
    write('scoring', {
      kind: 'spades-scoring',
      hands: one.map(([name, h, bagsBefore]) => ({
        name,
        hand: h,
        bagsBefore,
        expect: scoreHand(h, bagsBefore),
      })),
      runs: [
        {
          name: 'bag run: 52, 44, 63, 33 → 92',
          hands: run,
          expect: { lines: handLines(run), totals: totals(run) },
        },
      ],
      gameOver: over.map(([name, scores, rules]) => ({
        name,
        scores,
        rules,
        expect: gameOver(scores, rules),
      })),
      endResult: [
        { a: 90, b: 120 },
        { a: 120, b: 120 },
        { a: 300, b: -20 },
      ].map((scores) => ({ scores, expect: endResult(scores) })),
    });
  });

  it('legality', () => {
    const P = (spec: Array<[Seat, string]>): Play[] =>
      spec.map(([seat, c]) => ({ seat, card: card(c) }));
    const plays: Array<[string, string, Play[], boolean]> = [
      ['first lead, spades locked', '2h As 3c Kd', [], false],
      ['first lead, only spades', 'As 2s 9s', [], false],
      ['lead after spades broke', '2h As 3c', [], true],
      ['must follow', '2h Kh 3c As', P([[0, '9h']]), false],
      ['cannot follow: anything, a cut included', '3c As 4d', P([[0, '9h']]), false],
      ['spades led', '3s Qs 4d', P([[1, '9s']]), true],
      [
        'last to play, void',
        '3c 4d',
        P([
          [1, '9h'],
          [2, 'Ah'],
          [3, '2s'],
        ]),
        true,
      ],
    ];
    const outside = card('Qh');
    const tricks: Array<Array<[Seat, string]>> = [
      [
        [0, '9h'],
        [1, 'Ah'],
        [2, '2s'],
        [3, 'Kh'],
      ],
      [
        [0, '9h'],
        [1, '3s'],
        [2, '2s'],
        [3, 'Ks'],
      ],
      [
        [1, '9h'],
        [2, 'Ad'],
        [3, 'Kh'],
        [0, '2c'],
      ],
      [
        [2, '5c'],
        [3, 'Ah'],
        [0, 'Ad'],
        [1, '4c'],
      ],
      [
        [3, 'As'],
        [0, 'Ks'],
        [1, 'Ah'],
        [2, '2s'],
      ],
    ];
    const timeouts: Array<[string, Play[], boolean]> = [
      ['Kh 2s 3c 5h', [], true],
      ['Kh 2s 5h', P([[0, '4d']]), true],
      ['Kh 2s 5h', P([[0, '4h']]), true],
      ['Ks 2s', [], false],
      ['Ah Ad 2s', P([[0, '3c']]), true],
      ['5c 5d 5h', [], false],
    ];
    const bidRules: Array<[string, SpRules]> = [
      ['standard', rulesWith()],
      ['nil off', rulesWith({ nil: false })],
      ['min team bid 4', rulesWith({ minTeamBid: 4 })],
      ['min team bid 4, nil off', rulesWith({ minTeamBid: 4, nil: false })],
    ];
    const bidCases: Array<[Seat, (number | null)[]]> = [
      [0, [null, null, null, null]],
      [2, [1, null, null, null]],
      [2, [0, null, null, null]],
      [2, [5, null, null, null]],
      [3, [2, 3, 1, null]],
      [1, [4, null, 3, 2]],
    ];
    write('legal', {
      kind: 'spades-legal',
      plays: plays.map(([name, h, trick, broken]) => {
        const held = cards(h);
        return {
          name,
          hand: held,
          trick,
          broken,
          expect: {
            legal: legalPlays(held, trick, broken),
            problems: Object.fromEntries(
              [...held, outside].map((c) => [cardId(c), playProblem(c, held, trick, broken)]),
            ),
          },
        };
      }),
      tricks: tricks.map((t) => ({ plays: P(t), winner: trickWinner(P(t)) })),
      timeoutPlay: timeouts.map(([h, trick, broken]) => ({
        hand: cards(h),
        trick,
        broken,
        expect: timeoutPlay(cards(h), trick, broken),
      })),
      draws: ['5c Qd 9h 2s', 'Kd Kh 3c Kc', 'As Ah Ad Ac', '2c 2d 3c 2s'].map((d) => ({
        draw: cards(d),
        dealer: drawWinner(cards(d)),
      })),
      bids: bidRules.flatMap(([name, rules]) =>
        bidCases.map(([seat, bids]) => ({
          name,
          rules,
          seat,
          bids,
          expect: {
            min: minBidFor(seat, bids, rules),
            allowed: allowedBids(seat, bids, rules),
            problems: Object.fromEntries(
              [-1, 0, 1, 2, 3, 13, 14, 2.5].map((b) => [
                String(b),
                bidProblem(b, seat, bids, rules),
              ]),
            ),
          },
        })),
      ),
    });
  });

  it('upload validation', () => {
    const NOW = T0 + 86_400_000;
    const WON: KitEntry[] = [0, 1, 2].map(() => ({ bids: [4, 3, 4, 3], teamA: 8 }));
    const base = kitGame([{ bids: [3, 3, 3, 3], teamA: 6 }]);
    const cases: Array<[string, SpGame]> = [
      [
        'won on target',
        kitGame(WON, {
          status: 'finished',
          result: { winner: 'a', endedBy: 'target' },
          finishedAt: T0 + 1_800_000,
        }),
      ],
      [
        'in progress, bids in order',
        kitGame([...WON.slice(0, 2), { bids: [3, null, null, 2], phase: 'bidding' }]),
      ],
      ['cancelled', kitGame(WON.slice(0, 1), { status: 'cancelled' })],
      [
        'ended by the host, hand in progress dropped',
        kitGame([...WON.slice(0, 2), { bids: [null, null, null, 2], phase: 'bidding' }], {
          status: 'finished',
          result: { winner: 'a', endedBy: 'end' },
        }),
      ],
      [
        'called a draw',
        kitGame(WON.slice(0, 2), {
          status: 'finished',
          result: { winner: 'draw', endedBy: 'draw' },
        }),
      ],
      [
        'Nil, Blind Nil and both Nil',
        kitGame(
          [
            {
              bids: [0, 0, 0, 4],
              teamA: 3,
              nil: [1, 0, 2, null],
              blind: [true, false, false, false],
            },
          ],
          { rules: rulesWith({ blindNil: true }) },
        ),
      ],
      ['three players', { ...base, players: base.players.slice(0, 3) }],
      [
        'player name blank',
        { ...base, players: base.players.map((p, i) => (i ? p : { ...p, name: ' ' })) },
      ],
      ['rules: target 55', { ...base, rules: rulesWith({ target: 55 }) }],
      [
        'rules: Blind Nil without Nil',
        { ...base, rules: rulesWith({ nil: false, blindNil: true }) },
      ],
      ['first dealer 4', { ...base, firstDealerIndex: 4 }],
      ['hand dealer wrong', { ...base, hands: [{ ...base.hands[0], dealer: 2 }] }],
      ['hand after the game was won', kitGame([...WON, { bids: [3, 3, 3, 3], teamA: 6 }])],
      [
        'unfinished hand before the last',
        kitGame([
          { bids: [3, 3, 3, 3], phase: 'tricks' },
          { bids: [3, 3, 3, 3], teamA: 6 },
        ]),
      ],
      ['bid of 14', kitGame([{ bids: [3, 3, 14, 3], teamA: 6 }])],
      ['bids out of turn', kitGame([{ bids: [null, 3, null, 3], phase: 'bidding' }])],
      [
        'below the minimum team bid',
        kitGame([{ bids: [3, 1, 3, 2], teamA: 6 }], { rules: rulesWith({ minTeamBid: 4 }) }),
      ],
      [
        'Nil while Nil is off',
        kitGame([{ bids: [0, 3, 3, 3], teamA: 6, nil: [0, null, null, null] }], {
          rules: rulesWith({ nil: false }),
        }),
      ],
      [
        'Blind Nil while off',
        kitGame([
          {
            bids: [0, 3, 3, 3],
            teamA: 6,
            nil: [0, null, null, null],
            blind: [true, false, false, false],
          },
        ]),
      ],
      ['tricks over 13', kitGame([{ bids: [3, 3, 3, 3], teamA: 14 }])],
      [
        'Nil tricks over the team’s',
        kitGame([{ bids: [0, 3, 3, 3], teamA: 3, nil: [4, null, null, null] }]),
      ],
      [
        'both Nil, tricks not all theirs',
        kitGame([{ bids: [0, 3, 0, 3], teamA: 3, nil: [1, null, 1, null] }]),
      ],
      ['finished without a result', kitGame(WON, { status: 'finished' })],
      [
        'result disagrees with the hands',
        kitGame(WON, { status: 'finished', result: { winner: 'b', endedBy: 'target' } }),
      ],
      [
        'ended by hand after the game was won',
        kitGame(WON, { status: 'finished', result: { winner: 'a', endedBy: 'end' } }),
      ],
      [
        'active with a result',
        kitGame(WON.slice(0, 2), { result: { winner: 'a', endedBy: 'end' } }),
      ],
      ['from the future', { ...base, updatedAt: NOW + 3_600_000 }],
      ['hand before the game began', { ...base, hands: [{ ...base.hands[0], doneAt: T0 - 1 }] }],
    ];
    write('validate', {
      kind: 'spades-validate',
      now: NOW,
      cases: cases.map(([name, game]) => ({ name, game, expect: validate(game, NOW) })),
    });
  });
});
