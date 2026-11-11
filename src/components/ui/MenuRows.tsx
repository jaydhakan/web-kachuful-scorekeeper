import type { ReactElement } from 'react';
import { m } from 'framer-motion';
import { stagger } from './stagger';

/** A row of a game's menu sheet: icon and label, hairline above all but the first, staggered in. */
export function MenuRow({
  i,
  icon,
  label,
  onClick,
  rule,
}: {
  i: number;
  icon: ReactElement;
  label: string;
  onClick: () => void;
  rule: boolean;
}) {
  return (
    <m.button
      type="button"
      {...stagger(i)}
      whileTap="press"
      variants={{ press: { scale: 0.97 } }}
      onClick={onClick}
      className="relative isolate flex min-h-12 w-full items-center gap-3.5 rounded-2xl px-2 text-left text-17 font-medium tracking-[-0.012em]"
    >
      {/* Hairlines between rows, inset past the icon. */}
      {rule && <span aria-hidden className="absolute left-12 right-2 top-0 h-px bg-ov/10" />}
      <m.span
        aria-hidden
        initial={false}
        variants={{ press: { opacity: 1 } }}
        style={{ opacity: 0 }}
        className="absolute inset-0 -z-10 rounded-[inherit] bg-ov/[.07]"
      />
      <span aria-hidden className="grid w-7 place-items-center text-[var(--tx2)]">
        {icon}
      </span>
      {label}
    </m.button>
  );
}

/** One of the menu sheet's paired actions (Share, End game…); `neg` for the destructive one. */
export function MenuButton({
  icon,
  label,
  onClick,
  neg,
  wide,
  disabled,
}: {
  icon: ReactElement;
  label: string;
  onClick: () => void;
  neg?: boolean;
  wide?: boolean;
  disabled?: boolean;
}) {
  return (
    <m.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`mat-cta mat-sm relative isolate flex min-h-12 items-center justify-center gap-2 rounded-[18px] px-3 text-16 font-bold disabled:opacity-45 ${neg ? 'text-[var(--neg)]' : ''} ${wide ? 'col-span-2' : ''}`}
    >
      <span
        aria-hidden
        className={`${neg ? 'mat-fill-d' : 'mat-fill-s'} absolute inset-0 -z-10 rounded-[inherit]`}
      />
      <span aria-hidden className="grid place-items-center">
        {icon}
      </span>
      {label}
    </m.button>
  );
}
