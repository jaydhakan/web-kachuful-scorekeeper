import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { crownBeat, useCrownTakeover } from '@/components/crowns/CrownTakeover';
import { useMedals } from '@/games/kachuful/state/medals';
import { playOnce } from '@/games/kachuful/sound/once';
import type { Game } from '@/games/kachuful/domain';

/** "Naya Badshah!" at the end of a fresh game where gold changed hands (REWARDS-PLAN §6.7). */
export const useMedalTakeover = (g: Game, fresh: boolean, afterMs: number) =>
  useCrownTakeover(
    useMedals(),
    `crowns:${g.syncId}:${g.finishedAt ?? 0}`,
    `game:${g.syncId}`,
    fresh,
    afterMs,
  );

/**
 * The small line under the headline when nothing takes the screen (`crownBeat`). With `sound`, a game just ended
 * twinkles for a Wazir or Senapati swap or a new Sitara.
 */
export function useMedalBeat(sound?: {
  key: string;
  fresh: boolean;
  afterMs: number;
}): string | null {
  const { line, twinkle: changed } = crownBeat(useMedals());
  const rm = useReducedMotion();
  const [justEnded] = useState(!!sound?.fresh);
  // A Wazir or Senapati swap, or a new Sitara, twinkles once as its line shows (REWARDS-PLAN §12).
  const twinkle = justEnded && !!sound && changed;
  useEffect(() => {
    if (!twinkle || !sound) return;
    const run = playOnce(
      sound.key,
      { cues: [{ at: sound.afterMs, name: 'twinkle' }], reduced: { name: 'twinkle' } },
      { reduced: !!rm },
    );
    return () => run?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, for the game that just ended
  }, [twinkle]);
  return line;
}
