import { domAnimation, LazyMotion, MotionConfig, type FeatureBundle } from 'framer-motion';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ThemeSync } from '@/components/ThemeSync';
import { SPRING } from '@/components/ui/motion';
import { AppProvider } from '@/state/store';
import { whenIdle } from '@/lib/idle';

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
        <AppProvider>
          <ThemeSync />
          <AppShell />
        </AppProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
