import { m } from 'framer-motion';
import { useMemo } from 'react';
import { ACH, dailyAwards, dayOf } from '@/games/kachuful/domain';
import { useApp } from '@/games/kachuful/state/store';
import { useDeviceFacts, whoIs } from '@/games/kachuful/state/useFacts';
import { achName } from '@/games/kachuful/strings/achievements';
import { stagger } from '@/components/ui/stagger';
import { t } from '@/strings';

/** Today's awards on this device as a row of small chips; nothing at all on a day without rounds. */
export function TodayStrip({ className = '' }: { className?: string }) {
  const { actions } = useApp();
  const f = useDeviceFacts();
  const awards = useMemo(() => dailyAwards(f, dayOf(Date.now())), [f]);
  if (!awards.length) return null;
  return (
    <section aria-label={t.hub.home.awardsToday} className={`w-full ${className}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="text-13 font-bold uppercase tracking-[0.12em] text-[var(--tx2)]">
          {t.hub.home.awardsToday}
        </h2>
        <button
          type="button"
          onClick={() => actions.open({ screen: 'awards' })}
          className="press min-h-11 px-1 text-13 font-bold text-[var(--accent-tx)]"
        >
          {t.hub.home.seeAwards}
        </button>
      </div>
      <ul className="scroll-thin edge-fade -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {awards.slice(0, 8).map((a, i) => (
          <m.li key={a.code + a.playerId} {...stagger(i, 0.3)} className="shrink-0">
            <button
              type="button"
              onClick={() => actions.open({ screen: 'player', params: { id: a.playerId } })}
              className="press glass flex min-h-12 items-center gap-2 !rounded-full px-3 text-14 font-bold"
            >
              <span aria-hidden className="text-18">
                {ACH.get(a.code)?.emoji}
              </span>
              <span className="whitespace-nowrap">
                {whoIs(f, a.playerId).name}
                <span className="sr-only"> · {achName(a.code)}</span>
              </span>
            </button>
          </m.li>
        ))}
      </ul>
    </section>
  );
}
