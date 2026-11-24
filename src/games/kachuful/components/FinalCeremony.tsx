import { m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { Player } from '@/games/kachuful/domain';
import { lastGame as s } from '@/games/kachuful/strings/night';
import { Dot } from '@/components/ui/Dot';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SPRING_SOFT } from '@/components/ui/motion';

/**
 * The last game of the night's long ceremony (REWARDS-PLAN §7.1), after the slower podium: the winner on a stage
 * and "End the night". `bust` is where the winner's StageBust goes (`src/wardrobe`); until then their seat token.
 */
export function FinalCeremony({
  winners,
  delay,
  bust,
  onEndNight,
  className = '',
}: {
  winners: Player[];
  /** Seconds to wait for the podium's reveal (0 when reopened). */
  delay: number;
  bust?: ReactNode;
  onEndNight: () => void;
  className?: string;
}) {
  const rm = useReducedMotion();
  const first = winners[0];
  if (!first) return null;
  return (
    <m.section
      data-final-ceremony
      aria-labelledby="final-ceremony-title"
      initial={rm ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={rm ? { duration: 0.2, delay } : { ...SPRING_SOFT, delay }}
      className={`glass glass-glow flex flex-col items-center gap-2 px-5 pb-5 pt-4 text-center ${className}`}
    >
      <span className="mono-label text-13 font-bold text-[var(--gold-tx)]">{s.kicker}</span>
      <div data-bust-slot aria-hidden className="my-1 flex justify-center gap-2">
        {bust ?? winners.slice(0, 3).map((p) => <Dot key={p.id} p={p} s={72} />)}
      </div>
      <h2
        id="final-ceremony-title"
        className="disp text-24 font-extrabold leading-tight tracking-[-0.03em] [overflow-wrap:anywhere]"
      >
        {s.title(winners.map((p) => p.name))}
      </h2>
      <p className="text-15 text-[var(--tx2)]">{s.sub}</p>
      <PrimaryButton className="mt-2 w-full max-w-[22rem]" onClick={onEndNight}>
        {s.end}
      </PrimaryButton>
    </m.section>
  );
}
