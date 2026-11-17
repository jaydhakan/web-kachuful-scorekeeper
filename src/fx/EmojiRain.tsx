import { useLayoutEffect, useRef } from 'react';
import { BEAT_HOLD_MS } from '@/components/ui/motion';
import { anim, reducedMotion } from './waapi';

const DROPS = 24;
const FALL_MS = 1600;
/** Each drop's start, scrambled by hand across 0–400ms so neighbours never fall in step (no lines, no random). */
const DELAY = [
  0, 260, 90, 340, 170, 30, 390, 210, 120, 300, 60, 230, 380, 140, 10, 280, 190, 350, 80, 250, 40,
  320, 160, 110,
];

/**
 * WOW-MOMENTS-PLAN A3: copies of one reaction fall across the table, on Web Animations, behind the hand and never in
 * the way. Positions are fixed by index, so every phone's rain looks alike. Reduced motion: one large emoji, still,
 * shown and hidden. `onDone` fires when the last drop has fallen.
 */
export default function EmojiRain({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  const box = useRef<HTMLDivElement>(null),
    one = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const drops = Array.from(box.current?.children ?? []);
    const runs = drops.length
      ? drops.map((el, i) =>
          anim(el, [{ transform: 'translateY(-10vh)' }, { transform: 'translateY(110vh)' }], {
            duration: FALL_MS,
            delay: DELAY[i],
            easing: 'linear',
            fill: 'both',
          }),
        )
      : [
          anim(one.current, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], {
            duration: BEAT_HOLD_MS * 1.4,
          }),
        ];
    let live = true;
    void Promise.all(runs.map((r) => r.done)).then(() => live && onDone());
    return () => {
      live = false;
      runs.forEach((r) => r.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one rain per mount
  }, []);
  return (
    <div
      aria-hidden
      data-emoji-rain={emoji}
      className="pointer-events-none absolute inset-0 z-[8] overflow-hidden"
    >
      {reducedMotion() ? (
        <span ref={one} className="absolute left-1/2 top-1/3 -translate-x-1/2 text-96 opacity-0">
          {emoji}
        </span>
      ) : (
        <div ref={box}>
          {Array.from({ length: DROPS }, (_, i) => (
            <span
              key={i}
              className={`absolute top-0 ${i % 3 ? 'text-28' : 'text-36'}`}
              style={{
                left: `${(i / DROPS) * 92 + (i % 4) * 1.5}%`,
                transform: 'translateY(-10vh)',
              }}
            >
              {emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
