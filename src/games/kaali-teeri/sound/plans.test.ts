import { revealPlan } from '@/components/ui/podiumReveal';
import { FEEL } from '@/fx/feedback';
import { podiumCues } from '@/fx/podiumCues';
import { kitGame } from '@/games/kaali-teeri/domain/__fixtures__/kit';
import { SUITS } from '@/games/kaali-teeri/domain';
import {
  callFeel,
  confirmCues,
  dealCues,
  dealStages,
  quickFeel,
  randomDealerPlan,
  SUIT_PITCH,
  summaryFacts,
  summaryPlan,
  SUMMARY_STAGES,
  SWEEP_MS,
  verdictCues,
  viewerCues,
} from './plans';

const rules1 = { minBid: 150, decks: 1 as const };
const P = ['a', 'b', 'c', 'd'];
const hand = (bidder: number, bid: number, team: number) => ({ bidder, bid, team });

describe('auction feel', () => {
  it('every call has a kind that exists, and a raise climbs with the amount', () => {
    for (const w of ['pass', 'forced', 150, 200, 250] as const)
      expect(FEEL).toHaveProperty(callFeel(w, rules1).kind);
    const pitch = [150, 175, 200, 225, 245].map((n) => callFeel(n, rules1).pitch!);
    expect(pitch).toEqual([...pitch].sort((a, b) => a - b));
    expect(pitch[0]).toBe(0);
    expect(pitch[4]).toBeGreaterThan(pitch[1]);
  });

  it('the game’s top bid shimmers, a pass knocks, a forced take knocks then chips', () => {
    expect(callFeel(250, rules1).kind).toBe('raiseTop');
    expect(callFeel(500, { minBid: 350, decks: 2 }).kind).toBe('raiseTop');
    expect(callFeel(240, rules1).kind).toBe('raise');
    expect(callFeel('pass', rules1)).toEqual({ kind: 'pass' });
    expect(callFeel('forced', rules1)).toMatchObject({ kind: 'pass', then: { name: 'chip' } });
    expect(quickFeel(200, rules1)).toEqual({ kind: 'raise', pitch: callFeel(200, rules1).pitch });
  });

  it('each suit has its own register', () => {
    expect(new Set(SUITS.map((s) => SUIT_PITCH[s])).size).toBe(4);
  });
});

describe('the deal', () => {
  it('riffles when the cards leave, ticks no faster than the limiter allows, and ends within the deal', () => {
    for (const n of [4, 6, 10]) {
      const { T } = dealStages(n, true);
      const c = dealCues(n, true);
      expect(c.cues[0]).toMatchObject({ name: 'riffle', at: T[0] + T[1] });
      const ticks = c.cues.filter((x) => x.name === 'deal').map((x) => x.at);
      expect(ticks.length).toBeGreaterThan(1);
      ticks.slice(1).forEach((at, k) => expect(at - ticks[k]).toBeGreaterThanOrEqual(65));
      expect(Math.max(...ticks)).toBeLessThanOrEqual(T[0] + T[1] + T[2]);
      expect(c.reduced).toBeUndefined();
    }
  });

  it('starts later when the dealer chip has to move on', () => {
    expect(dealCues(5, true).cues[0].at).toBeGreaterThan(dealCues(5, false).cues[0].at);
  });

  it('the random dealer spins then pops; reduced motion only pops', () => {
    const p = randomDealerPlan();
    expect(p.cues.map((c) => c.name)).toEqual(['spin', 'pop']);
    expect(p.reduced).toEqual({ name: 'pop' });
  });
});

describe('the verdict and the summary', () => {
  // Riya (0) bids 180 with Aarav and makes it; Kabir then leads Riya after a miss.
  const make = (n: number) =>
    kitGame({
      id: 'g',
      players: P,
      start: 0,
      hands: [hand(0, 150, 160), hand(1, 160, 120)].slice(0, n),
    });
  // The summary is of the last hand scored: one game with one hand done, one with two.
  const g1 = make(1),
    g = make(2);
  const h1 = g1.hands[0],
    h2 = g.hands[1];

  it('made is pressed with a thud, a miss is a womp', () => {
    expect(verdictCues(true).map((c) => c.name)).toEqual(['made', 'thud']);
    expect(verdictCues(false).map((c) => c.name)).toEqual(['womp']);
  });

  it('reads who led and who crossed 1,000 from the board before and after', () => {
    const f1 = summaryFacts(g1, h1)!;
    expect(f1).toMatchObject({ made: true, good: true, newLeader: false, thousand: false });
    const f2 = summaryFacts(g, h2)!;
    expect(f2.made).toBe(false);
    expect(f2.newLeader).toBe(true);
  });

  it('runs the stages from the screen’s own timers: deltas stepping, the tally, then crown and bell', () => {
    const f = { ...summaryFacts(g, h2)!, thousand: true };
    const plan = summaryPlan(f, false);
    const names = plan.cues.map((c) => c.name);
    expect(names.filter((n) => n === 'made' || n === 'missed')).toHaveLength(4);
    expect(plan.cues.find((c) => c.name === 'tally')!.at).toBe(SUMMARY_STAGES[1]);
    expect(plan.cues.find((c) => c.name === 'bell')!.at).toBe(SUMMARY_STAGES[2]);
    expect(plan.cues.find((c) => c.name === 'crown')!.at).toBe(SUMMARY_STAGES[2]);
    expect(plan.reduced).toEqual({ name: 'bell' });
    expect(plan.settle).toEqual({ name: 'bell' });
    const madeRun = plan.cues.filter((c) => c.name === 'made').map((c) => c.pitch!);
    expect(madeRun).toEqual([...madeRun].sort((a, b) => a - b));
  });

  it('a sweep is announced first and shifts every stage by its own beat, as a beat-tier boom', () => {
    const f = { ...summaryFacts(g1, h1)!, sweep: 'bidders' as const };
    const plan = summaryPlan(f, true);
    expect(plan.cues[0]).toMatchObject({ at: 0, name: 'boom', tier: 'beat' });
    expect(plan.cues.find((c) => c.name === 'tally')!.at).toBe(SWEEP_MS + SUMMARY_STAGES[1]);
  });

  it('only the bell is ever a moment among the summary’s own sounds', () => {
    const f = { ...summaryFacts(g, h2)!, thousand: true, sweep: 'defenders' as const };
    const loud = summaryPlan(f, true).cues.filter(
      (c) => (c.tier ?? (c.name === 'bell' ? 'moment' : 'beat')) === 'moment',
    );
    expect(loud.map((c) => c.name)).toEqual(['bell']);
  });

  it('reduced motion collapses to the verdict and the one top cue at confirm', () => {
    expect(confirmCues(summaryFacts(g1, h1)!).map((c) => c.name)).toEqual(['made', 'thud']);
    const f = { ...summaryFacts(g, h2)!, newLeader: true, sweep: 'defenders' as const };
    expect(confirmCues(f).map((c) => c.name)).toEqual(['womp', 'crown']);
    expect(confirmCues({ ...f, thousand: true }).map((c) => c.name)).toEqual(['womp', 'bell']);
  });
});

describe('the winner', () => {
  it('uses the shared podium plan: thuds, a roll, the fanfare, which stands alone when reduced', () => {
    const c = podiumCues(revealPlan([1, 2, 3, 4]));
    expect(c.cues.map((x) => x.name)).toEqual(['thud', 'thud', 'roll', 'fanfare']);
    expect(c.reduced).toEqual({ name: 'fanfare' });
  });
});

describe('the viewer', () => {
  const at = (n: number, finished = false) =>
    kitGame({
      id: 'v',
      players: P,
      start: 0,
      finished,
      hands: [hand(0, 150, 160), hand(1, 160, 120)].slice(0, n),
    });

  it('hears nothing for the page just loading, a game it did not see before, or catching up', () => {
    expect(viewerCues(null, at(2))).toBeNull();
    expect(viewerCues(at(0), { ...at(2), syncId: 'other' })).toBeNull();
    expect(viewerCues(at(0), at(2))).toBeNull();
    expect(viewerCues(at(2), at(2))).toBeNull();
  });

  it('a hand landing is one sound, a new leader adds a crown, the end the fanfare', () => {
    expect(viewerCues(at(0), at(1))!.cues.map((c) => c.name)).toEqual(['made']);
    const two = viewerCues(at(1), at(2))!;
    expect(two.cues.map((c) => c.name)).toEqual(['missed', 'crown']);
    expect(two.reduced).toEqual({ name: 'crown' });
    const end = viewerCues(at(1), at(2, true))!;
    expect(end.cues.map((c) => c.name)).toEqual(['missed', 'fanfare']);
    expect(end.reduced).toEqual({ name: 'fanfare' });
    expect(viewerCues(at(2), at(2, true))!.cues.map((c) => c.name)).toEqual(['fanfare']);
  });
});
