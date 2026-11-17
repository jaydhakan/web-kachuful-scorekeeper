import { useMemo, useState } from 'react';
import type { Earned, Facts } from '@/games/kachuful/domain';
import { useDeviceFacts } from '@/games/kachuful/state/useFacts';
import { useLadderCounts } from '@/games/kachuful/components/useLadderCounts';
import { useProgressionEnv } from '@/games/kachuful/components/useProgressionEnv';
import { AchievementsView } from '@/components/progression/AchievementsView';
import { ProgressionScope } from '@/components/progression/env';
import { useEarned } from '@/components/progression/useProgressionData';

/** The whole catalogue: earned ones lit with when and how often, locked ones saying how to earn them. */
export function AchievementsPage({
  id,
  facts,
  extra = [],
}: {
  id?: string;
  facts?: Facts;
  extra?: Earned[];
}) {
  const device = useDeviceFacts();
  const f = facts ?? device;
  const env = useProgressionEnv(f);
  const [who, setWho] = useState<string | null>(id ?? null);
  const { all: earned, remote } = useEarned(env);
  const all = useMemo(
    () => (remote.data ? earned! : [...(earned ?? []), ...extra]),
    [earned, extra, remote.data],
  );
  // Unknown counts (crew, points gained, winning run when signed in) show their levels without a bar.
  const { counts, profile } = useLadderCounts(who, f);
  const mine = !who ? all : (profile.data?.achievements ?? all.filter((e) => e.playerId === who));
  return (
    <ProgressionScope env={env}>
      <AchievementsView
        all={all}
        mine={mine}
        who={who}
        onWho={setWho}
        counts={counts as Record<string, number> | null}
      />
    </ProgressionScope>
  );
}
