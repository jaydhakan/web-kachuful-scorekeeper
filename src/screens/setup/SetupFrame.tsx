import { motion } from 'framer-motion';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { Scaffold } from '@/components/ui/Scaffold';
import { SPRING } from '@/components/ui/motion';
import { minScale } from '@/lib/tableGeometry';
import { useSetup } from './useSetup';
import { t } from '@/strings';

const Dots = ({ step }: { step: number }) => (
  <div className="flex items-center gap-2" role="img" aria-label={t.setup.stepOf(step)}>
    {[1, 2, 3].map((i) => (
      // Each step remounts the frame; layoutId morphs the dots across it as transforms (radius corrected).
      <motion.i
        key={i}
        layoutId={`step-dot-${i}`}
        transition={SPRING}
        style={{ width: i === step ? 24 : 8, borderRadius: 999 }}
        className="relative block h-2 overflow-hidden bg-white/[.22]"
      >
        <motion.span
          className="absolute inset-0 bg-[var(--accent)]"
          initial={false}
          animate={{ opacity: i === step ? 1 : 0 }}
          transition={SPRING}
        />
      </motion.i>
    ))}
  </div>
);

// Scaffold's fitted area may shrink to nothing, which would let the table overlap the controls below it. This stops it
// at the table's minimum (0.45 for the setup preview, else 0.72 or 0.8 of 300px) plus the slot's mt-2, so the screen scrolls instead.
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
  fit?: boolean;
  collapseBar?: boolean;
}

export function SetupFrame({
  step,
  title,
  bar,
  children,
  aside,
  asideFirst,
  fit,
  collapseBar,
}: SetupFrameProps) {
  const { actions } = useSetup();
  const back = () =>
    step === 1 ? actions.go('home', -1) : actions.setupPatch({ step: (step - 1) as 1 | 2 });
  return (
    <Scaffold
      left={
        <IconButton label={t.common.back} onClick={back}>
          {Icon.back}
        </IconButton>
      }
      navTitle={<Dots step={step} />}
      title={title}
      aside={aside}
      asideFirst={asideFirst}
      fit={fit}
      collapseBar={collapseBar}
      className={fit ? FIT_MIN : ''}
      bar={bar}
    >
      {children}
    </Scaffold>
  );
}
