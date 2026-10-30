import { MotionConfig } from 'framer-motion';
import { AppShell } from '@/components/AppShell';
import { SPRING } from '@/components/ui/motion';
import { AppProvider } from '@/state/store';

export function App() {
  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </MotionConfig>
  );
}
