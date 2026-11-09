import { m } from 'framer-motion';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { Scaffold } from '@/components/ui/Scaffold';
import { SPRING } from '@/components/ui/motion';
import { minScale } from '@/lib/tableGeometry';
import { useKt } from '@/games/kaali-teeri/state/store';
import type { KtSetup } from '@/games/kaali-teeri/state/types';
import { ktSetup as s } from '@/games/kaali-teeri/strings/setup';

/** Setup screens render only while a setup is in progress. */
export function useSetup() {
  const { state, actions } = useKt();
  if (!state.setup) throw new Error('Setup state missing');
  return { su: state.setup as KtSetup, actions, state };
}

const Dots = ({ step }: { step: number }) => (
  <div className="flex items-center gap-2" role="img" aria-label={s.stepOf(step)}>
    {[1, 2, 3].map((i) => (
      // Each step remounts the frame; layoutId morphs the dots across it as transforms.
      <m.i
        key={i}
        layoutId={`kt-step-dot-${i}`}
        transition={SPRING}
        style={{ width: i === step ? 24 : 8, borderRadius: 999 }}
        className="relative block h-2 overflow-hidden bg-ov/[.22]"
      >
        <m.span
          className="absolute inset-0 bg-[var(--accent)]"
          initial={false}
          animate={{ opacity: i === step ? 1 : 0 }}
          transition={SPRING}
        />
      </m.i>
    ))}
  </div>
);

// The fitted area may shrink to nothing and let the table overlap the controls; this stops it at the table's
// minimum (0.45 for the preview, else 0.72 or 0.8 of 300px) plus the slot's margin, so the screen scrolls instead.
const FIT_MIN =
  '[&_div:has(>[data-fit-min="45"])]:min-h-[143px] [&_div:has(>[data-fit-min="72"])]:min-h-[224px] [&_div:has(>[data-fit-min="80"])]:min-h-[248px]';

/** Where a fitted table sits: full width on a phone, the left pane in two panes. */
export const TableSlot = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { players: number; minFit?: number }
>(({ players, minFit = minScale(players), className = '', ...rest }, ref) => (
  <div
    ref={ref}
    data-fit-min={Math.round(minFit * 100)}
    className={`-mx-5 mt-2 flex min-h-0 flex-1 flex-col pane:mx-0 ${className}`}
    {...rest}
  />
));
TableSlot.displayName = 'TableSlot';

interface SetupFrameProps {
  step: 1 | 2 | 3;
  title: string;
  bar: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
  asideFirst?: boolean;
}

/** The three setup steps' frame: Back, the step dots, a large title, the table and the action bar. */
export function SetupFrame({ step, title, bar, children, aside, asideFirst }: SetupFrameProps) {
  const { actions } = useSetup();
  const back = () => (step === 1 ? actions.go('home', -1) : actions.setupStep((step - 1) as 1 | 2));
  return (
    <Scaffold
      left={
        <IconButton chrome label={s.back} onClick={back}>
          {Icon.back}
        </IconButton>
      }
      navTitle={<Dots step={step} />}
      title={title}
      aside={aside}
      asideFirst={asideFirst}
      fit
      className={FIT_MIN}
      bar={bar}
    >
      {children}
    </Scaffold>
  );
}

/** A section's name in the mono role. */
export const SectionLabel = ({
  children,
  className = '',
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) => (
  <h2 id={id} className={`mono-label text-12 text-[var(--tx2)] ${className}`}>
    {children}
  </h2>
);
