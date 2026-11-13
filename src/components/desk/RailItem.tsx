import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import { PRESS_SM, SPRING } from '@/components/ui/motion';

interface RailItemProps {
  icon: ReactNode;
  /** The filled version, drawn while this is the current page. */
  iconOn?: ReactNode;
  label: string;
  on?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** One destination on the large-screen side rail: icon over label, the current one lit. */
export function RailItem({ icon, iconOn, label, on, disabled, onClick }: RailItemProps) {
  return (
    <m.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={on ? 'page' : undefined}
      whileTap={disabled ? undefined : PRESS_SM}
      transition={SPRING}
      className={`group relative isolate flex min-h-[3.75rem] w-[68px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl pb-2 pt-2.5 text-13 [@media(max-height:900px)]:min-h-[3.125rem] [@media(max-height:900px)]:gap-0.5 [@media(max-height:900px)]:py-1 font-bold disabled:cursor-default disabled:opacity-35 ${on ? 'text-[var(--tx)]' : 'text-[var(--tx2)]'}`}
    >
      {on && (
        <m.span
          layoutId="rail-on"
          transition={SPRING}
          aria-hidden
          className="absolute inset-0 -z-10 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_40%,transparent)]"
        />
      )}
      <span
        aria-hidden
        className="absolute inset-0 -z-20 rounded-2xl bg-ov/[.06] opacity-0 transition-opacity duration-200 [@media(hover:hover)]:group-enabled:group-hover:opacity-100"
      />
      <span className={on ? 'text-[var(--accent-tx)]' : ''}>{(on && iconOn) || icon}</span>
      {label}
    </m.button>
  );
}
