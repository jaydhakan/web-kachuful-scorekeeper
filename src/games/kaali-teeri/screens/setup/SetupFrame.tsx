import type { ReactNode } from 'react';
import { SetupFrame as Frame, type SetupFrameProps } from '@/components/seating/SetupFrame';
import { useKt } from '@/games/kaali-teeri/state/store';
import type { KtSetup } from '@/games/kaali-teeri/state/types';
import { ktSetup as s } from '@/games/kaali-teeri/strings/setup';

/** Setup screens render only while a setup is in progress. */
export function useSetup() {
  const { state, actions } = useKt();
  if (!state.setup) throw new Error('Setup state missing');
  return { su: state.setup as KtSetup, actions, state };
}

export { TableSlot } from '@/components/seating/SetupFrame';

/** Kaali Teeri's setup frame: Back steps through setup to Home; its tables always fit. */
export function SetupFrame(p: Omit<SetupFrameProps, 'fit'>) {
  const { actions } = useSetup();
  const back = () =>
    p.step === 1 ? actions.go('home', -1) : actions.setupStep((p.step - 1) as 1 | 2);
  return (
    <Frame
      {...p}
      fit
      onBack={back}
      backLabel={s.back}
      stepLabel={s.stepOf(p.step)}
      dotId="kt-step-dot"
    />
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
