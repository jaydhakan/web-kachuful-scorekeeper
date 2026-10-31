import { streakTier, type Streak } from '@/domain';
import { palette } from '@/theme/palette';
import { t } from '@/strings';

/** A player's current run, once it is long enough to celebrate: the step's emoji and the count. */
export function StreakBadge({ s }: { s: Streak | null }) {
  const tier = s ? streakTier(s.n) : -1;
  if (!s || tier < 0) return null;
  const color = s.kind === 'hot' ? palette.warning : palette['accent-spades'];
  return (
    <span
      role="img"
      aria-label={t.streak.count(s.kind, s.n)}
      className="ml-1.5 inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 align-[0.08em] text-14 font-extrabold leading-[1.4]"
      style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      {t.streak[s.kind][tier].emoji}
      {s.n}
    </span>
  );
}
