import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { saveNightSeen, wasNightSeen } from '@/state/persistence';
import { ep } from '@/sync/endpoints';
import { dropNight, news, useNews } from '@/sync/news';
import type { NightRow } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { nights as ns } from '@/games/kachuful/strings/night';
import { icon } from '@/components/ui/IconsMore';
import { Icon } from '@/components/ui/Icons';

// A closed night counts as "ready" on a device that hasn't opened it for a week: the group plays about weekly.
export const READY_MS = 7 * 864e5;

let opened = 0;
const subs = new Set<() => void>();
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};
/** Re-renders when a night is opened on this device, so "ready" cards and "New" marks go at once. */
export const useOpenedNights = () => useSyncExternalStore(subscribe, () => opened);

/** The night's story was shown here: remember it on this device and drop the stream's word of it. */
export function markNightOpened(id: string) {
  if (news().nights.includes(id)) dropNight(id);
  if (wasNightSeen(id)) return;
  saveNightSeen(id);
  opened++;
  subs.forEach((f) => f());
}

/** The list's cache key, shared by the ready card and the list so either shows the other's answer at once. */
export const nightsKey = (playerId: string) => `nights:${playerId}`;

export interface ReadyNight {
  id: string;
  row: NightRow | null;
}

/** The player's nights (newest first), asked again when the user stream says one has just closed. */
export function useNightList(playerId: string | null) {
  const latest = useNews().nights[0];
  const r = useRemote(playerId ? nightsKey(playerId) : null, () => ep.nights(playerId!, null));
  const heard = useRef(latest);
  const { reload } = r;
  useEffect(() => {
    if (!latest || latest === heard.current) return;
    heard.current = latest;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest]);
  return r;
}

/**
 * The newest night not yet opened here: one the user stream just closed, else the latest closed night from the
 * last week. Null without a player, or when there is none.
 */
export function useReadyNight(playerId: string | null): ReadyNight | null {
  useOpenedNights();
  const news = useNews();
  const r = useNightList(playerId);
  if (!playerId) return null;
  const rows = r.data?.items ?? [];
  const streamed = news.nights.find((id) => !wasNightSeen(id));
  if (streamed) return { id: streamed, row: rows.find((x) => x.id === streamed) ?? null };
  const row = rows.find(
    (x) => x.closed && x.id && !wasNightSeen(x.id) && Date.now() - x.endedAt < READY_MS,
  );
  return row?.id ? { id: row.id, row } : null;
}

/** "Your night is ready": the landing page and the Me page; a tap opens the night's story. */
export function NightReadyCard({
  ready,
  onOpen,
  className = '',
}: {
  ready: ReadyNight;
  onOpen: () => void;
  className?: string;
}) {
  const rm = useReducedMotion();
  const row = ready.row;
  return (
    <m.button
      type="button"
      data-night-ready
      aria-label={ns.readyAria}
      onClick={onOpen}
      initial={rm ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`press glass glass-glow flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left ${className}`}
    >
      <span aria-hidden className="shrink-0 text-[var(--accent-tx)]">
        {icon('gift', 'h-8 w-8')}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-16 font-bold">{ns.ready}</span>
        <span className="text-14 text-[var(--tx2)] [overflow-wrap:anywhere]">
          {ns.readySub(row?.games ?? null, row?.winner?.displayName ?? null)}
        </span>
      </span>
      <span aria-hidden className="shrink-0 text-[var(--tx2)]">
        {Icon.chev}
      </span>
    </m.button>
  );
}
