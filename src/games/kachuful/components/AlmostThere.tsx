import { ACH, nearestLevel } from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { useDeviceFacts } from '@/games/kachuful/state/useFacts';
import { achName } from '@/games/kachuful/strings/achievements';
import { t } from '@/strings';
import { Progress } from '@/components/ui/Stats';
import { Icon } from '@/components/ui/Icons';
import { useLadderCounts } from './useLadderCounts';

/** Signed in: the next level I'm closest to (at least half way), opening my achievements. */
export function AlmostThere({ className = '' }: { className?: string }) {
  const { state, actions } = useApp();
  const me = state.session?.player?.id ?? null;
  const f = useDeviceFacts();
  const { counts } = useLadderCounts(me, f);
  const n = counts ? nearestLevel(counts) : null;
  if (!me || !n) return null;
  const unit = t.hub.ach.ladders[n.ladder.id].count;
  return (
    <button
      type="button"
      onClick={() => actions.open({ screen: 'achievements', params: { id: me } })}
      className={`press glass flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left ${className}`}
    >
      <span
        aria-hidden
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-dashed border-gold text-22"
      >
        {ACH.get(n.code)?.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-13 font-bold uppercase tracking-[0.08em] text-[var(--accent)]">
          {t.hub.home.almost}
        </span>
        <span className="block text-16 font-bold [overflow-wrap:anywhere]">{achName(n.code)}</span>
        <span className="mt-1 flex items-center gap-2 text-13 text-[var(--tx2)]">
          <Progress v={n.count} of={n.step} fill="bg-gold" />
          <span className="shrink-0 tabular-nums">
            {unit} {n.count} / {n.step}
          </span>
        </span>
      </span>
      <span aria-hidden className="text-[var(--dis)]">
        {Icon.chev}
      </span>
    </button>
  );
}
