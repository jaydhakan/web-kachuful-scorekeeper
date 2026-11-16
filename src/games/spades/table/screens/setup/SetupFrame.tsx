import { m } from 'framer-motion';
import type { ReactNode } from 'react';
import { spGo } from '@/games/spades/nav';
import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import type { SpSetup } from '@/games/spades/table/state/types';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { Scaffold } from '@/components/ui/Scaffold';
import { SPRING } from '@/components/ui/motion';

const s = spTable.setup;

/** Setup screens render only while a setup is in progress. */
export function useSetup() {
  const { state, actions } = useSp();
  if (!state.setup) throw new Error('Setup state missing');
  return { su: state.setup as SpSetup, actions, state };
}

export { TableSlot } from '@/components/seating/SetupFrame';

/** Two steps, so two dots; the shared frame always draws three. */
const Dots = ({ step }: { step: 1 | 2 }) => (
  <div className="flex items-center gap-2" role="img" aria-label={s.stepOf(step)}>
    {[1, 2].map((i) => (
      <m.i
        key={i}
        layoutId={`sp-step-${i}`}
        transition={SPRING}
        style={{ width: i === step ? 24 : 8, borderRadius: 999 }}
        className={`block h-2 ${i === step ? 'bg-[var(--accent)]' : 'bg-ov/[.22]'}`}
      />
    ))}
  </div>
);

/** The scorekeeper's setup: Back steps to the players, then out to Spades' home; its tables always fit. */
export function SpSetupFrame({
  step,
  title,
  bar,
  aside,
  children,
}: {
  step: 1 | 2;
  title: string;
  bar: ReactNode;
  aside: ReactNode;
  children: ReactNode;
}) {
  const { actions } = useSetup();
  return (
    <Scaffold
      left={
        <IconButton
          chrome
          label={s.back}
          onClick={() => (step === 1 ? spGo('') : actions.setupStep(1))}
        >
          {Icon.back}
        </IconButton>
      }
      navTitle={<Dots step={step} />}
      title={title}
      aside={aside}
      fit
      className="[&_div:has(>[data-fit-min])]:min-h-[224px]"
      bar={bar}
    >
      {children}
    </Scaffold>
  );
}
