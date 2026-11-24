import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

/** The winner reveal's timings, in ms: a step rises, its player lands, a beat, then the name inks in. */
export const STEP_MS = 500;
export const STEP_GAP_MS = 500;
export const LAND_AFTER_MS = 330;
export const LAND_MS = 250;
export const BEAT_MS = 350;
export const NAME_MS = 700;
/** Entrances ease out (DESIGN-SYSTEM.md, Motion). */
export const RISE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type Place = 1 | 2 | 3;

export interface RevealPlan {
  /** When each step starts rising; null for a step nobody stands on, which is simply there. */
  step: Record<Place, number | null>;
  /** When the winner's name starts to ink in, and when it has completed. */
  name: number;
  done: number;
}

/** A leaderboard is opened often, so its steps follow each other sooner than a game's winner reveal. */
export const BOARD_GAP_MS = 260;
/** The last game of the night takes its time: still inside the game end's 4s ceiling with three on the podium. */
export const CEREMONY_GAP_MS = 750;

/** Lowest place first, the winner's step last; a place nobody holds (a tie above it, a short table) takes no turn. */
export function revealPlan(ranks: number[], gap = STEP_GAP_MS): RevealPlan {
  const taken = ([3, 2, 1] as const).filter((k) => ranks.includes(k));
  const step: RevealPlan['step'] = { 1: null, 2: null, 3: null };
  taken.forEach((k, i) => (step[k] = i * gap));
  const last = Math.max(0, taken.length - 1) * gap;
  const name = last + LAND_AFTER_MS + LAND_MS + BEAT_MS;
  return { step, name, done: name + NAME_MS };
}

export type RevealPhase = 'idle' | 'running' | 'done';

let phase: RevealPhase = 'idle';
const subs = new Set<() => void>();

/** Where the reveal on screen stands, for what lives outside the winner screen (confetti, badge cards). */
export const reveal = {
  get: () => phase,
  set(p: RevealPhase) {
    if (p === phase) return;
    phase = p;
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => void subs.delete(f);
  },
};

/** Runs a winner screen's reveal for a game just finished; otherwise (reopened, reduced motion) all is in place. */
export function useReveal(ranks: number[], fresh: boolean, gap = STEP_GAP_MS) {
  const rm = useReducedMotion();
  // Latched: the shell clears `fresh` when the confetti ends, which must neither replay nor cut the sequence.
  const [play] = useState(fresh && !rm);
  const plan = revealPlan(ranks, gap);
  const [named, setNamed] = useState(!play);
  useEffect(() => {
    if (!play) return;
    reveal.set('running');
    const tm = setTimeout(() => {
      setNamed(true);
      reveal.set('done');
    }, plan.done);
    return () => {
      clearTimeout(tm);
      reveal.set('idle');
    };
  }, [play, plan.done]);
  return { play, plan, named };
}
