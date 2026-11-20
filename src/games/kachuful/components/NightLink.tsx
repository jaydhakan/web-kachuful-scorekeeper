import { useMemo } from 'react';
import { nightOf } from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { useDeviceFacts } from '@/games/kachuful/state/useFacts';
import { night as s } from '@/games/kachuful/strings/night';
import { icon } from '@/components/ui/IconsMore';

/** "Tonight's Wrapped" on the winner screen, once tonight has two games or more (REWARDS-PLAN §7). */
export function NightLink({ className = '' }: { className?: string }) {
  const { actions } = useApp();
  const f = useDeviceFacts();
  const n = useMemo(() => nightOf(f, Date.now()), [f]);
  if (!n || n.gameIds.length < 2) return null;
  return (
    <button
      type="button"
      data-night-link
      onClick={() => actions.open({ screen: 'night' })}
      className={`press glass flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-2 text-left ${className}`}
    >
      <span aria-hidden className="text-[var(--accent-tx)]">
        {icon('gift', 'h-7 w-7')}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-16 font-bold">{s.open}</span>
        <span className="text-14 text-[var(--tx2)]">{s.openHint(n.gameIds.length)}</span>
      </span>
    </button>
  );
}
