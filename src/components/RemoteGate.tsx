import type { ReactNode } from 'react';
import { timeLabel } from '@/lib/dates';
import type { Remote } from '@/sync/useRemote';
import { ErrorState, Skeleton } from './ui/Page';
import { authError } from '@/screens/pages/AuthPages';
import { t } from '@/strings';

/** Loading, error and offline states for server data; renders the data as soon as there is any. */
export function RemoteGate<T>({
  r,
  children,
  rows = 5,
}: {
  r: Remote<T>;
  children: (data: T) => ReactNode;
  rows?: number;
}) {
  if (r.data == null) {
    if (r.error) return <ErrorState msg={authError(r.error)} onRetry={r.reload} />;
    return <Skeleton rows={rows} />;
  }
  return (
    <>
      {r.offline && r.fetchedAt && (
        <p role="status" className="mb-3 text-13 text-[var(--tx2)]">
          {t.hub.common.offline} · {t.hub.common.asOf(timeLabel(r.fetchedAt))}
        </p>
      )}
      {children(r.data)}
    </>
  );
}
