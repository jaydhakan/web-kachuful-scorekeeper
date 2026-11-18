import { SOUND_TIER } from '@/fx/sound';
import { stepDown, stepUp } from '@/fx/pitch';
import type { CuePlan } from '@/fx/sequence';
import {
  dealCues,
  hopDelay,
  hopsMs,
  liveCue,
  roundCue,
  spinCues,
  streakCues,
  summaryCues,
  type DealTiming,
  type SumFacts,
} from './plans';

const AT = [300, 900, 1700, 2300, 3000];
const facts = (o: Partial<SumFacts> = {}): SumFacts => ({
  results: ['made', 'missed', 'made', 'made'],
  soleMiss: false,
  newLeader: false,
  climb: 0,
  ...o,
});
const names = (p: CuePlan) => p.cues.map((c) => c.name);
const DEAL: DealTiming = {
  last: false,
  players: 4,
  needPass: true,
  liftAt: 350,
  lineAt: 1170,
  read: 300,
  lift: 120,
  gap: 0.06,
};

/** Only these may be heard on "Big moments"; every other cue must resolve to a beat or tick. */
const MOMENTS = new Set(['bell', 'fanfare', 'boom']);
const everyPlan = (): CuePlan[] => [
  spinCues(1500),
  dealCues(DEAL),
  dealCues({ ...DEAL, last: true, needPass: false }),
  summaryCues(AT, facts({ newLeader: true, climb: 3 }), 340),
  summaryCues(AT, facts({ results: ['made', 'made', 'made'] })),
  summaryCues(AT, facts({ results: ['made', 'made', 'made', 'missed'], soleMiss: true })),
  streakCues(0, 3),
  streakCues(3, 3),
];

describe('summaryCues: the score reveal', () => {
  it('steps made players up and missed ones down, one LAND_GAP apart in bid order', () => {
    const c = summaryCues(AT, facts()).cues.filter((x) => x.name === 'made' || x.name === 'missed');
    expect(c.map((x) => [x.name, x.at, x.pitch])).toEqual([
      ['made', 300, stepUp(0)],
      ['missed', 360, stepDown(0)],
      ['made', 420, stepUp(1)],
      ['made', 480, stepUp(2)],
    ]);
  });

  it('a sole miss lands its miss with the first made delta, then the rest in turn, then the womp', () => {
    const p = summaryCues(
      AT,
      facts({ results: ['made', 'made', 'missed', 'made'], soleMiss: true }),
    );
    const run = p.cues.filter((x) => x.name === 'made' || x.name === 'missed');
    // The miss and the first made delta land together, as in the animation.
    expect(run.map((x) => [x.name, x.at])).toEqual([
      ['made', 300],
      ['missed', 300],
      ['made', 360],
      ['made', 420],
    ]);
    expect(p.cues.find((x) => x.name === 'womp')!.at).toBe(300 + 4 * 60 + 80);
  });

  it('everyone made it ends the run on a chime (a beat, not a moment)', () => {
    const p = summaryCues(AT, facts({ results: ['made', 'made', 'made'] }));
    expect(p.cues.find((x) => x.name === 'chime')).toMatchObject({
      at: 300 + 3 * 60 + 80,
      tier: 'beat',
    });
  });

  it('counts up on stage 2, rises once per rival passed, and crowns on stage 4', () => {
    const p = summaryCues(AT, facts({ newLeader: true, climb: 3 }), 340);
    expect(p.cues.find((x) => x.name === 'tally')!.at).toBe(900);
    const rise = p.cues.filter((x) => x.name === 'rise');
    expect(rise.map((x) => [x.at, x.pitch])).toEqual([
      [1360, stepUp(0)],
      [1530, stepUp(1)],
      [1700, stepUp(2)],
    ]);
    expect(p.cues.find((x) => x.name === 'crown')!.at).toBe(2300);
  });

  it('is in time order and ends on its one settled sound', () => {
    const p = summaryCues(AT, facts({ newLeader: true, climb: 2 }), 170);
    const at = p.cues.map((c) => c.at);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(p.settle).toEqual({ name: 'crown' });
    expect(summaryCues(AT, facts()).settle).toBeUndefined();
  });

  it('reduced motion keeps one sound: crown, else womp, else chime, else none', () => {
    expect(summaryCues(AT, facts({ newLeader: true })).reduced).toEqual({ name: 'crown' });
    expect(summaryCues(AT, facts({ soleMiss: true })).reduced).toEqual({ name: 'womp' });
    expect(summaryCues(AT, facts({ results: ['made', 'made'] })).reduced).toMatchObject({
      name: 'chime',
    });
    expect(summaryCues(AT, facts()).reduced).toBeUndefined();
  });
});

describe('dealCues: the deal', () => {
  it('turns the trump, passes the chip, then deals a card per player on the gap', () => {
    const p = dealCues(DEAL);
    expect(names(p)).toEqual(['flick', 'pop', 'deal', 'deal', 'deal', 'deal']);
    expect(p.cues[0].at).toBe(350 + 120);
    expect(p.cues[1].at).toBe(1170 + 300);
    expect(p.cues.slice(2).map((c) => c.at)).toEqual([2270, 2330, 2390, 2450]);
    expect(p.reduced).toBeUndefined();
  });

  it('without a chip pass the cards follow the read by 120ms', () => {
    const p = dealCues({ ...DEAL, needPass: false });
    expect(names(p)).not.toContain('pop');
    expect(p.cues.find((c) => c.name === 'deal')!.at).toBe(1170 + 300 + 120);
  });

  it('the last round rings the bell and deals each card lower; reduced motion keeps the bell', () => {
    const p = dealCues({ ...DEAL, last: true });
    expect(p.cues.find((c) => c.name === 'bell')).toBeDefined();
    expect(p.cues.filter((c) => c.name === 'deal').every((c) => c.pitch === -3)).toBe(true);
    expect(p.reduced).toEqual({ name: 'bell' });
    expect(names(dealCues(DEAL))).not.toContain('bell');
  });
});

describe('spin, streak and live cues', () => {
  it('the dealer spin ratchets three times inside its own length, getting quieter', () => {
    const p = spinCues(1500);
    expect(p.cues.map((c) => c.at)).toEqual([0, 525, 1050]);
    expect(p.cues.every((c) => c.name === 'spin')).toBe(true);
    expect(p.reduced).toBeUndefined();
  });

  it('the roulette is as long as its hops', () => {
    expect(hopsMs(1)).toBe(200);
    const hops = 12;
    let sum = 200;
    for (let i = 1; i < hops; i++) sum += hopDelay(i, hops);
    expect(hopsMs(hops)).toBeCloseTo(sum);
  });

  it('a streak chimes, and only its top step booms', () => {
    expect(names(streakCues(1, 3))).toEqual(['chime']);
    expect(names(streakCues(3, 3))).toEqual(['chime', 'boom']);
    expect(streakCues(3, 3).reduced).toEqual({ name: 'boom' });
  });

  it('one sound stands for a round: crown, womp or chime, else nothing', () => {
    expect(roundCue({ results: ['made'], soleMiss: false, newLeader: true })).toEqual({
      name: 'crown',
    });
    expect(roundCue({ results: ['made', 'missed'], soleMiss: true, newLeader: false })).toEqual({
      name: 'womp',
    });
    expect(roundCue({ results: ['made', 'made'], soleMiss: false, newLeader: false })?.name).toBe(
      'chime',
    );
    expect(roundCue({ results: ['made', 'missed'], soleMiss: false, newLeader: false })).toBeNull();
  });

  it('a live round makes its one sound, the finish the fanfare, and a re-delivery nothing', () => {
    const next = {
      results: ['made', 'made'] as SumFacts['results'],
      soleMiss: false,
      newLeader: false,
    };
    const r4 = { rounds: 4, finished: false };
    expect(liveCue(r4, { ...next, rounds: 5, finished: false })?.name).toBe('chime');
    expect(liveCue(r4, { ...next, rounds: 5, finished: true })).toEqual({ name: 'fanfare' });
    expect(liveCue(r4, { ...next, ...r4 })).toBeNull();
    expect(
      liveCue({ rounds: 5, finished: true }, { ...next, rounds: 5, finished: true }),
    ).toBeNull();
  });
});

describe('Big moments', () => {
  it('only the bell, the fanfare and the top streak boom may be a moment; every other cue resolves to a beat or tick', () => {
    for (const p of everyPlan())
      for (const c of [
        ...p.cues,
        ...(p.reduced ? [p.reduced] : []),
        ...(p.settle ? [p.settle] : []),
      ])
        expect(MOMENTS.has(c.name) ? true : (c.tier ?? SOUND_TIER[c.name]) !== 'moment').toBe(true);
  });

  it('a normal round has no moment at all', () => {
    for (const p of [dealCues(DEAL), summaryCues(AT, facts({ newLeader: true, climb: 2 }))])
      for (const c of p.cues) expect(c.tier ?? SOUND_TIER[c.name]).not.toBe('moment');
  });
});
