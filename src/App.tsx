import { MotionConfig } from 'framer-motion';
import type { CSSProperties } from 'react';
import { Phone } from '@/components/Phone';
import { SPRING } from '@/components/ui/motion';
import { AppProvider, useApp } from '@/state/store';
import { TR } from '@/theme/trumps';

function Shell() {
  const { trump } = useApp();
  return (
    <div
      className="h-full w-full bg-[var(--bg)]"
      style={{ '--shell-glow': TR[trump].glow } as CSSProperties}
    >
      <div className="mx-auto h-full w-full max-w-[430px] min-[600px]:shadow-[0_0_120px_-10px_var(--shell-glow)]">
        <Phone />
      </div>
    </div>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <AppProvider>
        <Shell />
      </AppProvider>
    </MotionConfig>
  );
}
