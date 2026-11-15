import type { ReactNode } from 'react';

/**
 * An invited chair: the person's avatar dimmed inside a slowly turning dashed ring, until they answer. The ring
 * stands still under reduced motion. `className` sizes the box; the avatar (children) fills it.
 */
export function SeatInviteRing({
  children,
  className = 'h-14 w-14',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span data-invited="" className={`relative inline-grid place-items-center ${className}`}>
      <span className="grid h-full w-full place-items-center opacity-45 [&>*]:h-full [&>*]:w-full">
        {children}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1.5 animate-[spin_5s_linear_infinite] rounded-full border-2 border-dashed border-[var(--accent)] motion-reduce:animate-none"
      />
    </span>
  );
}
