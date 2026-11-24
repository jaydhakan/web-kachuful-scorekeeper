import { lazy, Suspense } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import type { StageBustProps } from './StageBust';

const Bust = lazy(() => import('./StageBust'));

/** The stage bust, fetched on first use (the art never rides a first load); until then the plain face. */
export function StageBustLazy(props: StageBustProps) {
  return (
    <Suspense fallback={<Waiting {...props} />}>
      <Bust {...props} />
    </Suspense>
  );
}

function Waiting({ p, size, className = '' }: StageBustProps) {
  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size, containerType: 'size' }}
    >
      <Avatar
        p={p}
        className="absolute grid place-items-center rounded-full leading-none"
        style={{ left: '28%', top: '20%', width: '44%', height: '44%', fontSize: '24cqw' }}
      />
    </span>
  );
}
