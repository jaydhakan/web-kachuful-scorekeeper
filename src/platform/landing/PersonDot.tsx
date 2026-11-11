import type { Session } from '@/state/persistence';
import { seatColor } from '@/theme/palette';
import { Icon } from '@/components/ui/Icons';

/**
 * The signed-in person's emoji on their colour. Not the shared Avatar: that one reads photos from the archive, which
 * the landing page's chunk must not pull in.
 */
export function PersonDot({ session, className = '' }: { session: Session; className?: string }) {
  const p = session.player;
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full ${p ? '' : 'bg-[var(--surface-3)]'} ${className}`}
      style={p ? { background: seatColor(p.color) } : undefined}
    >
      {p ? p.emoji : Icon.user}
    </span>
  );
}
