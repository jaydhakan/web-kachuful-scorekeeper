import type { ReactNode } from 'react';
import { timeLabel } from '@/lib/dates';
import type { Remote } from '@/sync/useRemote';
import { ErrorState, Skeleton } from './ui/Page';
import { authError } from '@/platform/pages/AuthPages';
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
  if (r.data == null) return <RemotePending r={r} rows={rows} />;
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

/** What server data shows before it has arrived: placeholder rows, or the error with a retry. */
export function RemotePending<T>({ r, rows = 5 }: { r: Remote<T>; rows?: number }) {
  if (r.error) return <ErrorState msg={authError(r.error)} onRetry={r.reload} />;
  return <Skeleton rows={rows} />;
}
