import { useReducedMotion } from 'framer-motion';
import { useMemo, useSyncExternalStore } from 'react';
import { ACH } from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { achName } from '@/games/kachuful/strings/achievements';
import { reveal } from '@/components/ui/podiumReveal';
import { MomentPopLazy as MomentPop } from '@/components/progression/MomentPopLazy';
import { t } from '@/strings';

const STREAK = /^(hot|cold)_/;

/**
 * The round's achievements, after any full-screen streak burst: the big ones dealt as the unlock card, the rest as
 * cards that drop in under the top bar and leave on their own, never taking focus or blocking a tap.
 */
export function BadgePop() {
  const { state, actions } = useApp();
  const rm = useReducedMotion();
  const phase = useSyncExternalStore(reveal.subscribe, reveal.get);
  // On a game just finished the cards wait for the winner's name, so they never cover the podium's reveal.
  const held = state.fresh && state.screen === 'winner' && !rm && phase !== 'done';
  const pops = state.streakFx || held ? null : state.pops;
  // Built once per batch: a new object is a new batch to MomentPop.
  const shown = useMemo(
    () =>
      pops && {
        id: pops.id,
        cards: [
          ...pops.items.map((x) => {
            const def = ACH.get(x.code);
            return {
              k: x.code + x.name,
              emoji: def?.emoji ?? '🏅',
              text: `${x.name} · ${achName(x.code)}`,
              who: x.name,
              what: achName(x.code),
              // Streaks have their own full-screen burst (a card when it can't play); the rest of the big ones are dealt.
              ...(def?.big && !STREAK.test(x.code) ? { tier: 'big' as const } : {}),
            };
          }),
          ...(pops.more ? [{ k: 'more', emoji: '✨', text: t.hub.pops.more(pops.more) }] : []),
        ],
      },
    [pops],
  );
  return <MomentPop pops={shown} onDone={actions.popsDone} />;
}
