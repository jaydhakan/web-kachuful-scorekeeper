import { domAnimation, LazyMotion, MotionConfig, type FeatureBundle } from 'framer-motion';
import { lazy, Suspense } from 'react';
import { SPRING } from '@/components/ui/motion';
import { PlatformRoot } from '@/platform/PlatformRoot';
import { ThemeSync } from '@/components/ThemeSync';

// The moments lab (`/?lab=moments`): dev builds only; the build drops the branch and its chunk.
const MomentsLab =
  import.meta.env.DEV && new URLSearchParams(location.search).get('lab') === 'moments'
    ? lazy(() => import('@/fx/lab/MomentsLab'))
    : null;

/**
 * `features`: main.tsx passes the full set (layout and drag), loaded before the first render; tests get the basic
 * one. Never swapped once rendered: a component that gains features while it leaves (a sheet just closed, a toast)
 * never finishes and stays on screen.
 */
export function App({ features = domAnimation }: { features?: FeatureBundle }) {
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
