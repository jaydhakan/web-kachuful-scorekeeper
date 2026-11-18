import { useProgressionEnv } from '@/games/kachuful/components/useProgressionEnv';
import { ProgressionScope } from '@/components/progression/env';
import { ActivityPage as SharedActivity } from '@/components/progression/ActivityPage';

/** What happened lately across everyone's games: achievements, finished games, new players, season closes. */
export function ActivityPage() {
  const env = useProgressionEnv(null);
  return (
    <ProgressionScope env={env}>
      <SharedActivity />
    </ProgressionScope>
  );
}
