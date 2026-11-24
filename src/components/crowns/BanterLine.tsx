import { m, useReducedMotion } from 'framer-motion';
import { EASE, REDUCED } from '@/components/ui/motion';

/** One cheeky line over the standings (REWARDS-PLAN §6.7); announced once, as the line arrives after the status exists. */
export function BanterLine({
  text,
  show,
  anim,
  className = '',
}: {
  text: string;
  show: boolean;
  anim: boolean;
  className?: string;
}) {
  const rm = useReducedMotion();
  return (
    <p
      role="status"
      data-banter
      className={`min-h-5 font-semibold leading-5 text-[var(--gold-tx)] [text-wrap:balance] ${className}`}
    >
      {show && (
        <m.span
          className="inline-block"
          initial={anim ? { opacity: 0, y: rm ? 0 : 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: rm ? REDUCED : 0.25, ease: EASE }}
        >
          {text}
        </m.span>
      )}
    </p>
  );
}
