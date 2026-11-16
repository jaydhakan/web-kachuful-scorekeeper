import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PlayingCard } from '@/components/ui/PlayingCard';
import { SPRING_POP } from '@/components/ui/motion';
import { vibrate } from '@/hooks/useHaptics';
import type { Card, Seat } from '../../domain';
import type { Place } from './seats';

/** The draw for deal's beats, in ms from the start: the cards land, turn over, the highest is lit, then play opens. */
export const DRAW_TIMES = { flip: 950, win: 1650, done: 3100 } as const;
/** With reduced motion the cards are face up at once; the winner is lit and held this long. */
export const DRAW_REDUCED_MS = 1400;

// Each card stops between the table's centre and its chair, in px from the centre.
const TO: Record<Place, { x: number; y: number }> = {
  S: { x: 0, y: 40 },
  N: { x: 0, y: -40 },
  W: { x: -64, y: 0 },
  E: { x: 64, y: 0 },
};
const TILT: Record<Place, number> = { S: -8, N: 12, W: 18, E: -15 };

type Beat = 'fly' | 'flip' | 'win';

/**
 * The draw for deal: four face-down cards fly from the middle of the table toward the chairs, one after another, turn
 * over, and the highest grows and glows. `onWin` puts the dealer chip on its chair; `onDone` opens the table.
 */
export function DrawReveal({
  drawn,
  dealer,
  placeOf,
  onWin,
  onDone,
}: {
  drawn: Card[];
  dealer: Seat;
  placeOf: (s: Seat) => Place;
  onWin: () => void;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const [beat, setBeat] = useState<Beat>(reduced ? 'win' : 'fly');
  useEffect(() => {
    const at = (ms: number, f: () => void) => setTimeout(f, ms);
    const won = () => {
      setBeat('win');
      onWin();
      vibrate(12);
    };
    const ts = reduced
      ? [at(0, won), at(DRAW_REDUCED_MS, onDone)]
      : [
          at(DRAW_TIMES.flip, () => setBeat('flip')),
          at(DRAW_TIMES.win, won),
          at(DRAW_TIMES.done, onDone),
        ];
    return () => ts.forEach(clearTimeout);
    // The sequence runs once per draw; the callbacks are read when it fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {drawn.map((c, i) => {
        const seat = i as Seat;
        const to = TO[placeOf(seat)];
        const up = beat !== 'fly';
        const lit = beat === 'win' && seat === dealer;
        return (
          <m.span
            key={i}
            data-draw={seat}
            data-dealer={seat === dealer ? '' : undefined}
            className="absolute left-1/2 top-1/2 -ml-5 -mt-7"
            initial={
              reduced
                ? { opacity: 0, ...to }
                : { x: 0, y: 0, rotate: TILT[placeOf(seat)], opacity: 0 }
            }
            animate={{
              ...to,
              rotate: 0,
              opacity: 1,
              scale: lit ? 1.25 : beat === 'win' ? 0.92 : 1,
            }}
            transition={{ ...SPRING_POP, delay: beat === 'fly' ? i * 0.11 : 0 }}
            style={{ zIndex: lit ? 2 : 1 }}
          >
            <m.span
              key={up ? 'up' : 'down'}
              className="block"
              initial={up && !reduced ? { scaleX: 0 } : false}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1], delay: up ? i * 0.06 : 0 }}
            >
              <PlayingCard
                rank={c.rank}
                suit={c.suit}
                face={up ? 'up' : 'down'}
                size="xs"
                className={`!w-10 ${lit ? 'shadow-[0_0_0_3px_var(--medal-gold),0_0_24px_var(--medal-gold)]' : ''}`}
              />
            </m.span>
          </m.span>
        );
      })}
    </div>
  );
}
