import { HAPTIC, type Cue, type FeedbackKind } from '@/fx/feedback';
import { bidPitch, stepDown, stepUp } from '@/fx/pitch';
import type { CuePlan, TimedCue } from '@/fx/sequence';
import {
  deckTotal,
  doneHands,
  handScore,
  result,
  standings,
  totals,
  TARGET,
  type KtGame,
  type KtHand,
  type KtRules,
  type Suit,
} from '@/games/kaali-teeri/domain';
import type { KtCallWhat } from '@/games/kaali-teeri/state/types';

/** The plans for Kaali Teeri's sounds: pure, from the same timings the screens animate with. */

// The same limiter gap the engine keeps per sound (a little over its 60ms), so a run is never thinned.
const RUN_GAP_MS = 65;

/** A failed bid tips and settles: its buzz is longer than a made one's. */
export const HAPTIC_MISSED: number[] = [20, 60, 20];

// ---- Setup and the deal -------------------------------------------------------------------------------------------

/** The random dealer's spin lasts this long (the `spin` sound's own length); the pop lands as it stops. */
export const SPIN_MS = 600;
export const randomDealerPlan = (): CuePlan => ({
  cues: [
    { at: 0, name: 'spin' },
    { at: SPIN_MS, name: 'pop' },
  ],
  reduced: { name: 'pop' },
});

/** The deal's stage timers (`Deal.tsx`): the chip moves on, the cards fly (`dealMs`), then what to take out. */
export const dealStages = (n: number, needPass: boolean) => {
  const dealMs = (n - 1) * 50 + 480 + 120;
  return { dealMs, T: [520, needPass ? 650 : 80, dealMs, 1500] as const };
};

/** A riffle as the cards leave the deck, then a tick as cards land, one per ~100ms (a seat every 50ms is too fast). */
export function dealCues(n: number, needPass: boolean): CuePlan {
  const { T } = dealStages(n, needPass);
  const start = T[0] + T[1];
  const cues: TimedCue[] = [{ at: start, name: 'riffle', tier: 'tick', gain: 0.6 }];
  let last = -Infinity;
  for (let k = 0; k < n; k++) {
    const at = start + k * 50 + 480;
    if (at - last < RUN_GAP_MS) continue;
    last = at;
    cues.push({ at, name: 'deal', pitch: (cues.length % 2) * 2 });
  }
  return { cues };
}

// ---- The auction --------------------------------------------------------------------------------------------------

export interface CallFeel {
  kind: FeedbackKind;
  pitch?: number;
  /** A second sound a moment later (a forced take: knock, then chip). */
  then?: TimedCue;
}

/** What one auction turn sounds like: a raise climbs with the amount, the top bid shimmers, a pass knocks. */
export function callFeel(what: KtCallWhat, rules: Pick<KtRules, 'minBid' | 'decks'>): CallFeel {
  if (what === 'pass') return { kind: 'pass' };
  if (what === 'forced') return { kind: 'pass', then: { at: 90, name: 'chip' } };
  const top = deckTotal(rules.decks);
  return {
    kind: what >= top ? 'raiseTop' : 'raise',
    pitch: bidPitch(what, rules.minBid, top),
  };
}

/** Quick mode names the winner after the fact: one chip at the bid's pitch. */
export const quickFeel = (bid: number, rules: Pick<KtRules, 'minBid' | 'decks'>): CallFeel => ({
  kind: 'raise',
  pitch: bidPitch(bid, rules.minBid, deckTotal(rules.decks)),
});

// ---- The call and the play ----------------------------------------------------------------------------------------

/** A trump's register: spades low, hearts high, so the four are told apart by ear. */
export const SUIT_PITCH: Record<Suit, number> = { spades: -5, clubs: -2, diamonds: 2, hearts: 4 };

/** A partner's dot lands on their seat: one pop, higher for each later card. */
export const landPitch = (cardIndex: number) => stepUp(cardIndex);

// ---- Result and summary -------------------------------------------------------------------------------------------

/** The summary's stage timers (ms after the hand is confirmed, plus the sweep's own beat when there is one). */
export const SUMMARY_STAGES = [250, 700, 1500] as const;
export const SWEEP_MS = 900;

export interface SummaryFacts {
  /** Players in the order the list shows them as the deltas pop (the board before this hand). */
  order: string[];
  delta: Record<string, number>;
  made: boolean;
  sweep: 'none' | 'bidders' | 'defenders';
  /** The verdict is good news (made, or the bidders swept). */
  good: boolean;
  /** Someone alone on top who wasn't before (never on a game's first hand: everyone starts level). */
  newLeader: boolean;
  /** Someone's total crossed 1,000 with this hand. */
  thousand: boolean;
}

/** What the scored hand changed, from the game with that hand done. */
export function summaryFacts(g: KtGame, h: KtHand): SummaryFacts | null {
  const res = result(h, g.rules);
  if (!res) return null;
  const ids = g.players.map((p) => p.id);
  const before = doneHands(g).filter((x) => x !== h);
  const pt = totals(g, before),
    ct = totals(g);
  const was = standings(g, before),
    now = standings(g);
  const sole = (st: typeof now) =>
    st.filter((x) => x.rank === 1).length === 1 ? st[0].p.id : null;
  const lead = sole(now);
  return {
    order: was.map((x) => x.p.id),
    delta: handScore(h, g.rules, ids),
    made: res.made,
    sweep: res.sweep,
    good: res.sweep === 'bidders' || (res.made && res.sweep === 'none'),
    newLeader: before.length > 0 && lead !== null && lead !== sole(was),
    thousand: ids.some((id) => pt[id] < TARGET && ct[id] >= TARGET),
  };
}

/** The verdict's sound: made is pressed down and thuds, a miss tips with a womp. */
export const verdictCues = (good: boolean): Cue[] =>
  good ? [{ name: 'made' }, { name: 'thud', gain: 0.8 }] : [{ name: 'womp' }];
export const verdictHaptic = (good: boolean) => (good ? HAPTIC.BEAT : HAPTIC_MISSED);

const SWEEP_BOOM: Cue = { name: 'boom', tier: 'beat', gain: 0.6 };

/** The count-up's sounds from `SUMMARY_STAGES`: the sweep first, the deltas stepping, the tally, then crown and bell. */
export function summaryPlan(f: SummaryFacts, beat: boolean): CuePlan {
  const wait = beat ? SWEEP_MS : 0;
  const cues: TimedCue[] = [];
  if (beat) cues.push({ at: 0, ...SWEEP_BOOM });
  let up = 0,
    down = 0;
  f.order.forEach((id, k) => {
    const at = wait + SUMMARY_STAGES[0] + k * RUN_GAP_MS;
    if (f.delta[id] > 0) cues.push({ at, name: 'made', pitch: stepUp(up++) });
    else cues.push({ at, name: 'missed', pitch: stepDown(down++) });
  });
  cues.push({ at: wait + SUMMARY_STAGES[1], name: 'tally' });
  const end = wait + SUMMARY_STAGES[2];
  if (f.thousand) cues.push({ at: end, name: 'bell' });
  if (f.newLeader) cues.push({ at: end, name: 'crown' });
  const top = topCue(f);
  return { cues, ...(top && { reduced: top, settle: top }) };
}

/** The one sound that stands for a hand's changes when the run is collapsed. */
function topCue(f: SummaryFacts): Cue | undefined {
  return f.thousand
    ? { name: 'bell' }
    : f.newLeader
      ? { name: 'crown' }
      : f.sweep !== 'none'
        ? SWEEP_BOOM
        : undefined;
}

/** Under reduced motion the stages never run, so confirming the hand plays what they would have: verdict and top cue. */
export const confirmCues = (f: SummaryFacts): Cue[] => {
  const top = topCue(f);
  return [...verdictCues(f.good), ...(top ? [top] : [])];
};

// ---- The viewer ---------------------------------------------------------------------------------------------------

const VIEW_GAP_MS = 350;

/**
 * What a live spectator hears when the table's game changes under them: a hand landing is one sound (made or missed),
 * a new leader a crown, the end the fanfare. Several hands at once is catching up after a gap: silent.
 */
export function viewerCues(prev: KtGame | null, next: KtGame): CuePlan | null {
  if (!prev || prev.syncId !== next.syncId) return null;
  const landed = doneHands(next).length - doneHands(prev).length;
  const ended = prev.status !== 'finished' && next.status === 'finished';
  if (landed > 1 || landed < 0 || (landed === 0 && !ended)) return null;
  const fanfare: Cue = { name: 'fanfare' };
  if (landed === 0) return { cues: [{ at: 0, ...fanfare }], reduced: fanfare };
  const h = doneHands(next).at(-1)!;
  const f = summaryFacts(next, h);
  if (!f) return null;
  const first: Cue = f.good ? { name: 'made' } : { name: 'missed' };
  const cues: TimedCue[] = [{ at: 0, ...first }];
  if (ended) cues.push({ at: VIEW_GAP_MS, ...fanfare });
  else if (f.newLeader) cues.push({ at: VIEW_GAP_MS, name: 'crown' });
  const reduced = ended ? fanfare : f.newLeader ? { name: 'crown' as const } : first;
  return { cues, reduced };
}
