import type { ReactNode } from 'react';
import { t } from '@/strings';

/** One number in a profile's strip (rank, games, achievements) that opens its screen. Three sit in a row. */
export function HeroStat({
  label,
  value,
  sub,
  said,
  onClick,
}: {
  label: string;
  /** The whole tile in words for screen readers, as the visible parts would run together. */
  said: string;
  value: ReactNode;
  sub?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={said}
      onClick={onClick}
      className="press glass flex min-h-[5.5rem] min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center"
    >
      <span className="disp text-24 font-extrabold leading-none tabular-nums">{value}</span>
      {sub && <span className="text-13 text-[var(--tx2)]">{sub}</span>}
      <span className="text-13 font-bold text-[var(--tx2)]">{label}</span>
    </button>
  );
}

/** The strip while the profile loads. */
export const HeroStatsSkeleton = () => (
  <div aria-busy="true" aria-label={t.hub.common.loading} className="grid grid-cols-3 gap-2">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-[5.5rem] rounded-2xl bg-ov/[.05]" />
    ))}
  </div>
);
