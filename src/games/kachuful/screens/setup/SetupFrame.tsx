import { SetupFrame as Frame, type SetupFrameProps } from '@/components/seating/SetupFrame';
import { useSetup } from './useSetup';
import { t } from '@/strings';

export { TableSlot } from '@/components/seating/SetupFrame';

/** Kachuful's setup frame: Back steps through setup to Home. */
export function SetupFrame(p: SetupFrameProps) {
  const { actions } = useSetup();
  const back = () =>
    p.step === 1 ? actions.go('home', -1) : actions.setupPatch({ step: (p.step - 1) as 1 | 2 });
  return (
    <Frame
      {...p}
      onBack={back}
      backLabel={t.common.back}
      stepLabel={t.setup.stepOf(p.step)}
      dotId="step-dot"
    />
  );
}
