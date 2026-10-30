import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { Scaffold } from '@/components/ui/Scaffold';
import { SPRING } from '@/components/ui/motion';
import { useSetup } from './useSetup';
import { t } from '@/strings';

const Dots = ({ step }: { step: number }) => (
  <div className="flex items-center gap-2" role="img" aria-label={t.setup.stepOf(step)}>
    {[1, 2, 3].map((i) => (
      // Each step remounts the frame; layoutId morphs the dots across it as transforms (radius corrected).
      <motion.i
        key={i}
        layoutId={`step-dot-${i}`}
        transition={SPRING}
        style={{ width: i === step ? 24 : 8, borderRadius: 999 }}
        className="relative block h-2 overflow-hidden bg-white/[.22]"
      >
        <motion.span
          className="absolute inset-0 bg-[var(--accent)]"
          initial={false}
          animate={{ opacity: i === step ? 1 : 0 }}
          transition={SPRING}
        />
      </motion.i>
    ))}
  </div>
);

interface SetupFrameProps {
  step: 1 | 2 | 3;
  title: string;
  bar: ReactNode;
  children: ReactNode;
}

export function SetupFrame({ step, title, bar, children }: SetupFrameProps) {
  const { actions } = useSetup();
  const back = () =>
    step === 1 ? actions.go('home', -1) : actions.setupPatch({ step: (step - 1) as 1 | 2 });
  return (
    <Scaffold
      left={
        <IconButton label={t.common.back} onClick={back}>
          {Icon.back}
        </IconButton>
      }
      navTitle={<Dots step={step} />}
      title={title}
      bar={bar}
    >
      {children}
    </Scaffold>
  );
}
