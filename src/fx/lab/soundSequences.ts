import { revealPlan } from '@/components/ui/podiumReveal';
import { podiumCues } from '../podiumCues';
import { bidPitch, stepDown, stepUp } from '../pitch';
import type { CuePlan, TimedCue } from '../sequence';

/** The reveal's per-player gap in Kachuful's summary (`LAND_GAP`). */
const LAND_GAP = 60;

const run = (made: boolean[]): TimedCue[] => {
  let up = 0;
  let down = 0;
  return made.map((ok, i) => ({
    at: i * LAND_GAP,
    name: ok ? 'made' : 'missed',
    pitch: ok ? stepUp(up++) : stepDown(down++),
  }));
};

export interface LabSequence {
  game: 'Kachuful' | 'Kaali Teeri' | 'Shared';
  title: string;
  plan: CuePlan;
}

const tail = (n: number) => n * LAND_GAP + 120;

/** What each game's moments sound like in order, played from the Sound Board. */
export const SEQUENCES: LabSequence[] = [
  {
    game: 'Kachuful',
    title: 'Round: everyone made it',
    plan: { cues: [...run([true, true, true, true]), { at: tail(4), name: 'chime' }] },
  },
  {
    game: 'Kachuful',
    title: 'Round: a sole miss',
    plan: {
      cues: [...run([true, true, true, false]), { at: tail(4), name: 'womp' }],
    },
  },
  {
    game: 'Kachuful',
    title: 'Round: new leader',
    plan: {
      cues: [
        ...run([true, false, true, true]),
        { at: 700, name: 'tally' },
        { at: 1400, name: 'crown' },
      ],
    },
  },
  {
    game: 'Kachuful',
    title: 'Comeback climb',
    plan: {
      cues: [0, 1, 2, 3].map((i): TimedCue => ({ at: i * 170, name: 'rise', pitch: i * 2 })),
    },
  },
  { game: 'Kachuful', title: 'The hook bites', plan: { cues: [{ at: 0, name: 'hook' }] } },
  {
    game: 'Kachuful',
    title: 'Last round',
    plan: { cues: [{ at: 0, name: 'bell' }] },
  },
  {
    game: 'Kaali Teeri',
    title: 'Auction up to 250',
    plan: {
      cues: [155, 165, 180, 200, 225].map((amt, i): TimedCue => ({
        at: i * 450,
        name: 'chip',
        pitch: bidPitch(amt, 155, 250),
      })),
    },
  },
  {
    game: 'Kaali Teeri',
    title: 'SOLD',
    plan: { cues: [{ at: 0, name: 'gavel' }] },
  },
  {
    game: 'Kaali Teeri',
    title: 'Verdict: made',
    plan: {
      cues: [
        { at: 0, name: 'made' },
        { at: 60, name: 'thud' },
      ],
    },
  },
  {
    game: 'Kaali Teeri',
    title: 'Verdict: failed',
    plan: { cues: [{ at: 0, name: 'womp' }] },
  },
  { game: 'Kaali Teeri', title: '1000 reached', plan: { cues: [{ at: 0, name: 'bell' }] } },
  {
    game: 'Shared',
    title: 'Winner (4 players)',
    plan: podiumCues(revealPlan([1, 2, 3, 4])),
  },
  {
    game: 'Shared',
    title: 'Leaderboard podium',
    plan: podiumCues(revealPlan([1, 2, 3, 4], 260), { board: true }),
  },
];
