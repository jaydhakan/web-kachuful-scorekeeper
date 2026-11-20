import { m, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Confetti } from '@/components/ui/Confetti';
import { EASE } from '@/components/ui/motion';
import { palette } from '@/theme/palette';
import { festivalOn, type Festival } from '../festival';

/** Points round the felt's rim, as % of the table box: where the diyas sit. */
const RIM = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
  return { x: 50 + 46 * Math.cos(a), y: 50 + 44 * Math.sin(a) };
});
const GULAAL = ['bg-gold', 'bg-[var(--accent)]', 'bg-[var(--brand)]', 'bg-[var(--pos)]'];
// Centred with `translate`, which composes with the transform Framer Motion animates.
const pin = 'pointer-events-none absolute select-none [translate:-50%_-50%]';

/**
 * The table dressed for a festival on the day (REWARDS-PLAN §8), for the deal of round 1 only: a dead spot, never
 * during input. Decoration alone (aria-hidden); transform and opacity only, and nothing under reduced motion.
 */
export function FestivalTable({ now = Date.now() }: { now?: number }) {
  const rm = useReducedMotion();
  const [day] = useState<Festival | null>(() => festivalOn(now));
  if (rm || !day) return null;
  return (
    <div aria-hidden data-festival={day} className="pointer-events-none absolute inset-0 z-[6]">
      {day === 'diwali' &&
        RIM.map((p, i) => (
          <m.span
            key={i}
            className={`${pin} text-17`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0.75, 1, 0.8], scale: 1 }}
            transition={{ duration: 2.4, delay: i * 0.08, ease: EASE }}
          >
            🪔
          </m.span>
        ))}
      {day === 'eid' &&
        Array.from({ length: 5 }, (_, i) => (
          <m.span
            key={i}
            className={`${pin} text-17`}
            style={{ left: `${18 + i * 16}%`, top: `${6 + (i % 2) * 4}%` }}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
          >
            🏮
          </m.span>
        ))}
      {day === 'holi' &&
        GULAAL.map((c, i) => (
          <m.span
            key={i}
            className={`${pin} h-16 w-16 rounded-full ${c}`}
            style={{ left: `${42 + (i % 2) * 16}%`, top: `${42 + Math.floor(i / 2) * 16}%` }}
            initial={{ opacity: 0, scale: 0.2 }}
            animate={{ opacity: [0, 0.55, 0], scale: [0.2, 1.6, 2] }}
            transition={{ duration: 1.6, delay: i * 0.12, ease: EASE }}
          />
        ))}
      {day === 'christmas' &&
        Array.from({ length: 6 }, (_, i) => (
          <m.span
            key={i}
            className={`${pin} text-15`}
            style={{ left: `${12 + i * 15}%`, top: '0%' }}
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], y: 160 + (i % 3) * 40 }}
            transition={{ duration: 2.6, delay: i * 0.2, ease: 'linear' }}
          >
            ❄️
          </m.span>
        ))}
      {day === 'uttarayan' && (
        <m.span
          className={`${pin} text-24`}
          style={{ left: '0%', top: '22%' }}
          initial={{ opacity: 0, x: 0, rotate: -12 }}
          animate={{ opacity: [0, 1, 1, 0], x: 320, rotate: 8 }}
          transition={{ duration: 2.8, ease: EASE }}
        >
          🪁
        </m.span>
      )}
      {day === 'newyear' && (
        <Confetti colors={[palette['gold-light'], palette.gold, palette['gold-mid']]} count={60} />
      )}
    </div>
  );
}
