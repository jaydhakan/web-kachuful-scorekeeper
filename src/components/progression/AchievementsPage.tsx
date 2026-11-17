import { useState } from 'react';
import { AchievementsView } from './AchievementsView';
import { useProgressionEnv } from './env';
import { useEarned, useLadderCounts } from './useProgressionData';

/** A game's Achievements page, opened on one player (`id`) or everyone; inside the game's `ProgressionScope`. */
export function AchievementsPage({ id }: { id?: string }) {
  const env = useProgressionEnv();
  const [who, setWho] = useState<string | null>(id ?? null);
  const { all, remote } = useEarned(env);
  const counts = useLadderCounts(env, who);
  const mine = !who ? (all ?? []) : (all ?? []).filter((e) => e.playerId === who);
  return (
    <AchievementsView
      all={all}
      remote={remote}
      mine={mine}
      who={who}
      onWho={setWho}
      counts={counts}
    />
  );
}
