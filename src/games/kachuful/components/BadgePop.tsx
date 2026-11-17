import { useReducedMotion } from 'framer-motion';
import { useMemo, useSyncExternalStore } from 'react';
import { ACH } from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { achName } from '@/games/kachuful/strings/achievements';
import { reveal } from '@/components/ui/podiumReveal';
import { MomentPop } from '@/components/progression/MomentPop';
import { t } from '@/strings';

/**
 * The round's smaller achievements as cards that drop in under the top bar, after any full-screen streak burst,
 * and leave on their own. They never take focus or block a tap.
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
          ...pops.items.map((x) => ({
            k: x.code + x.name,
            emoji: ACH.get(x.code)?.emoji ?? '🏅',
            text: `${x.name} · ${achName(x.code)}`,
          })),
          ...(pops.more ? [{ k: 'more', emoji: '✨', text: t.hub.pops.more(pops.more) }] : []),
        ],
      },
    [pops],
  );
  return <MomentPop pops={shown} onDone={actions.popsDone} />;
}
