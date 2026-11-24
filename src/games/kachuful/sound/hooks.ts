import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { CEREMONY_GAP_MS, revealPlan } from '@/components/ui/podiumReveal';
import { playCue } from '@/fx/feedback';
import { podiumCues } from '@/fx/podiumCues';
import {
  bidOrder,
  doneRounds,
  standings,
  type Game,
  type Outcome,
  type Round,
} from '@/games/kachuful/domain';
import { soleMiss } from '@/games/kachuful/screens/round/Summary';
import { playOnce } from './once';
import { liveCue } from './plans';

/** Each player's result in bid order, the order the reveal lands them in. */
export const resultsInBidOrder = (g: Game, r: Round): Extract<Outcome, string>[] =>
  bidOrder(g, r).flatMap((i) => {
    const v = r.results[g.players[i].id];
    return v ? [v] : [];
  });

/**
 * The winner reveal's sounds, once per finished game and only for one that just finished (never a reopened one).
 * `ceremony`: the last game of the night's slower reveal and its cracker.
 */
export function useWinnerSound(ranks: number[], fresh: boolean, key: string, ceremony = false) {
  const rm = useReducedMotion();
  // Latched like the reveal's own `play`: the shell clears `fresh` when the confetti ends, which must not cut it.
  const [go] = useState(fresh);
  useEffect(() => {
    if (!go) return;
    const plan = revealPlan(ranks, ceremony ? CEREMONY_GAP_MS : undefined);
    const run = playOnce(key, podiumCues(plan, { ceremony }), { reduced: !!rm });
    return () => run?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one run per mount
  }, []);
}

/**
 * The live page's ears: a round that lands, or the game finishing, after the page loaded. The first state is history
 * and makes no sound, and a re-delivery of the same state (a StrictMode re-run, a repeated event) none either.
 */
export function useLiveSound(g: Game | null) {
  const last = useRef<{ rounds: number; finished: boolean } | null>(null);
  useEffect(() => {
    if (!g) return;
    const done = doneRounds(g),
      now = { rounds: done.length, finished: g.status === 'finished' },
      was = last.current;
    last.current = now;
    if (!was) return;
    const r = done.at(-1);
    if (!r) return;
    const before = done.filter((x) => x !== r),
      results = resultsInBidOrder(g, r);
    const c = liveCue(was, {
      ...now,
      results,
      soleMiss: !!soleMiss(g.players, r.results),
      newLeader: before.length > 0 && standings(g, before)[0].p.id !== standings(g)[0].p.id,
    });
    if (c) playCue(c);
  }, [g]);
}
