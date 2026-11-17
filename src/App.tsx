import { domAnimation, LazyMotion, MotionConfig, type FeatureBundle } from 'framer-motion';
import { lazy, Suspense, useEffect, useState } from 'react';
import { SPRING } from '@/components/ui/motion';
import { whenIdle } from '@/lib/idle';
import { PlatformRoot } from '@/platform/PlatformRoot';
import { ThemeSync } from '@/components/ThemeSync';

// The moments lab (`/?lab=moments`): dev builds only; the build drops the branch and its chunk.
const MomentsLab =
  import.meta.env.DEV && new URLSearchParams(location.search).get('lab') === 'moments'
    ? lazy(() => import('@/fx/lab/MomentsLab'))
    : null;

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
        <ThemeSync />
        {MomentsLab ? (
          <Suspense fallback={null}>
            <MomentsLab />
          </Suspense>
        ) : (
          <PlatformRoot />
        )}
      </MotionConfig>
    </LazyMotion>
  );
}
