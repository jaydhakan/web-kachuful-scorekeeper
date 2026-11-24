import { LINE } from './types';

/** The shoulders every bust starts from (and all that shows without an outfit). */
export const SHOULDERS = 'M6 100C7 81 17 71 33 66.5Q41 64 50 64Q59 64 67 66.5C83 71 93 81 94 100Z';

export function Base() {
  return <path d={SHOULDERS} style={{ ...LINE, fill: 'var(--cloth-base)' }} />;
}

/** The far side of each sleeve, in shade: gives a flat outfit its shoulders. */
export function Sleeves({ fill }: { fill: string }) {
  return (
    <path
      d="M6 100C7 84 13 76 22 71C19 80 19 90 21 100ZM94 100C93 84 87 76 78 71C81 80 81 90 79 100Z"
      style={{ fill, stroke: 'none' }}
    />
  );
}
