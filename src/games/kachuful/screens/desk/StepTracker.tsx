import { StepTracker as Tracker } from '@/components/desk/StepTracker';
import { t } from '@/strings';

export type Step = 0 | 1 | 2;

interface StepTrackerProps {
  step: Step;
  /** Whether a step can be reached from here (going back always can; forward only when the round allows it). */
  can: (s: Step) => boolean;
  go: (s: Step) => void;
}

/** Bid, Play, Results: where the round is, and a way back (or on) with one click. */
export function StepTracker({ step, can, go }: StepTrackerProps) {
  return (
    <Tracker
      labels={[t.desk.steps.bid, t.desk.steps.play, t.desk.steps.results]}
      label={t.desk.steps.label}
      step={step}
      can={(s) => can(s as Step)}
      go={(s) => go(s as Step)}
    />
  );
}
