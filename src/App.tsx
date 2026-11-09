import { domAnimation, LazyMotion, MotionConfig, type FeatureBundle } from 'framer-motion';
import { useEffect, useState } from 'react';
import { SPRING } from '@/components/ui/motion';
import { whenIdle } from '@/lib/idle';
import { PlatformRoot } from '@/platform/PlatformRoot';

export function App() {
  // Animations, exits and gestures from the first paint; layout and drag follow when the page is idle (~10 KB gzip
  // off the first load). Features register globally, so a component picks them up on its next render.
  const [features, setFeatures] = useState<FeatureBundle>(domAnimation);
  useEffect(
    () =>
      whenIdle(() => void import('@/components/ui/motionMax').then((f) => setFeatures(f.default))),
    [],
  );
  return (
    <LazyMotion features={features} strict>
      <MotionConfig reducedMotion="user" transition={SPRING}>
        <PlatformRoot />
      </MotionConfig>
    </LazyMotion>
  );
}
