import { motion } from 'framer-motion';
import type { ReactNode, RefObject } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { Scaffold } from '@/components/ui/Scaffold';
import { SPRING } from '@/components/ui/motion';
import { useSetup } from './useSetup';

const Dots = ({ step }: { step: number }) => (
  <div className="flex items-center gap-2" role="img" aria-label={`Step ${step} of 3`}>
    {[1, 2, 3].map((i) => (
      <motion.i
        key={i}
        animate={{
          width: i === step ? 24 : 8,
          backgroundColor: i === step ? 'var(--accent)' : 'rgba(255,255,255,.22)',
        }}
        transition={SPRING}
        className="block h-2 rounded-full"
      />
    ))}
  </div>
);

interface SetupFrameProps {
  step: 1 | 2 | 3;
  title: string;
  bar: ReactNode;
  children: ReactNode;
  scrollRef?: RefObject<HTMLDivElement>;
}

export function SetupFrame({ step, title, bar, children, scrollRef }: SetupFrameProps) {
  const { actions } = useSetup();
  const back = () =>
    step === 1 ? actions.go('home', -1) : actions.setupPatch({ step: (step - 1) as 1 | 2 });
  return (
    <Scaffold
      scrollRef={scrollRef}
      left={
        <IconButton label="Back" onClick={back}>
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
