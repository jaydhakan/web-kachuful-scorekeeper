import { useMemo, useSyncExternalStore } from 'react';
import { archive, type Archive } from './archive';

const subscribe = (f: () => void) => archive.subscribe(f);
const version = () => archive.version;

/** Re-renders when the archive changes; derived data should be memoised on the returned version. */
export function useArchiveVersion(): number {
  return useSyncExternalStore(subscribe, version);
}

/** A value derived from the archive, recomputed only when the archive changes. `pick` must not read props. */
export function useArchive<T>(pick: (a: Archive) => T): T {
  const v = useArchiveVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed per archive version by design
  return useMemo(() => pick(archive), [v]);
}
