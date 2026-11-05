import type { ReactNode } from 'react';
import type { Face } from './Avatar';
import { Dot } from './Dot';

/** A player's face and name inline, where text used to read "🦊 Jay": the photo shows once they have one. */
export const PlayerTag = ({
  p,
  name,
  s = 20,
  className = '',
}: {
  p: Face;
  name: ReactNode;
  s?: number;
  className?: string;
}) => (
  <span className={`inline-flex max-w-full items-center gap-1.5 align-middle ${className}`}>
    <span aria-hidden className="inline-flex">
      <Dot p={p} s={s} />
    </span>
    <span className="min-w-0 [overflow-wrap:anywhere]">{name}</span>
  </span>
);
