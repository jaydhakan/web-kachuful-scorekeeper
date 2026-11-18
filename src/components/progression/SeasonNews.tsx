import { monthLabel, parseDay } from '@/lib/dates';
import { monthOf } from '@/progression/zone';
import { wasSeasonShown } from '@/state/persistence';
import { fx } from '@/strings/fx';
import { icon } from '@/components/ui/IconsMore';
import type { ProgressionEnv } from './env';
import { useSeasons } from './useProgressionData';

/**
 * On a game's leaderboard, the first visits after a month closes: the season is decided, and a tap opens Awards,
 * where its podium is revealed (once per device, `SeasonPodium`). Gone once that reveal has been seen.
 */
export function SeasonNews({ env, onOpen }: { env: ProgressionEnv; onOpen: () => void }) {
  const { champions } = useSeasons(env, monthOf(Date.now()));
  const newest = champions.reduce<string | null>(
    (m, c) => (c.playerId && (!m || c.season > m) ? c.season : m),
    null,
  );
  if (!newest || wasSeasonShown(env.prog.id, newest)) return null;
  const month = monthLabel(parseDay(newest + '-01'));
  return (
    <button
      type="button"
      data-season-news
      onClick={onOpen}
      className="glass press relative mb-4 flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left shadow-[inset_0_0_0_2px_var(--medal-gold)]"
    >
      <span aria-hidden className="text-[var(--gold-tx)]">
        {icon('crown', 'h-7 w-7')}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-17 font-bold">{fx.seasonDecided(month)}</span>
        <span className="block text-14 text-[var(--tx2)]">{fx.seasonReveal}</span>
      </span>
    </button>
  );
}
