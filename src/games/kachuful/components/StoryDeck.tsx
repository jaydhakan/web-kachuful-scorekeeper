import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EASE } from '@/components/ui/motion';

// A slide comes in over this long; the last one then holds for a beat before its value arrives.
const SLIDE = 0.35;
const BEAT = 0.35;
// A flick this fast (px/s) turns the slide even when it travelled less than SWIPE px.
const FLICK = 400;
const SWIPE = 60;
// The entrance curve of DESIGN-SYSTEM.md (Motion).
const SETTLE = [0.22, 1, 0.36, 1] as const;

export interface Slide {
  kicker: string;
  /** As a function it is told when to start counting, for a value that arrives after the slide has. */
  big: ReactNode | ((run: boolean) => ReactNode);
  sub?: ReactNode;
  /** A Phosphor illustration, or the player's own avatar emoji for the people slides. */
  emoji: ReactNode;
}

/** The last slide's value: nothing for a beat after the slide has landed, then it settles in and counts. */
function Finale({ s, rm }: { s: Slide; rm: boolean | null }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setOn(true), (SLIDE + BEAT) * 1000);
    return () => clearTimeout(id);
  }, []);
  const hidden = rm ? { opacity: 0 } : { opacity: 0, scale: 0.9 };
  return (
    <m.span
      initial={hidden}
      animate={on ? { opacity: 1, scale: 1 } : hidden}
      transition={{ duration: 0.45, ease: SETTLE }}
      className="flex flex-col items-center gap-4"
    >
      <Value s={s} run={on} />
    </m.span>
  );
}

function Value({ s, run }: { s: Slide; run: boolean }) {
  return (
    <>
      <span className="disp gold-text text-52 font-extrabold leading-none [overflow-wrap:anywhere]">
        {typeof s.big === 'function' ? s.big(run) : s.big}
      </span>
      {s.sub && <span className="text-20 text-[var(--tx2)]">{s.sub}</span>}
    </>
  );
}

/**
 * A Wrapped-style deck of story cards (the year's Wrapped, the night's): tap or swipe for the next, a progress strip
 * above, Previous and Next below. The last card's value arrives a beat after the card.
 */
export function StoryDeck({
  slides,
  label,
  prev,
  next,
}: {
  slides: Slide[];
  label: string;
  prev: string;
  next: string;
}) {
  const [i, setI] = useState(0);
  // Which way the deck is moving: Next brings a slide in from the right, Previous from the left.
  const [dir, setDir] = useState(1);
  const rm = useReducedMotion();
  const go = (d: number) => {
    setDir(d);
    setI((k) => Math.max(0, Math.min(slides.length - 1, k + d)));
  };
  // The click that ends a swipe is the swipe's, not a tap to advance.
  const swiped = useRef(false);
  const side = (d: number) => (rm ? { opacity: 0 } : { opacity: 0, x: 40 * d, scale: 0.96 });
  const s = slides[i];
  if (!s) return null;
  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 flex w-[min(100%,26rem,calc(62svh*9/14))] gap-1" aria-hidden>
        {slides.map((_, k) => (
          <span
            key={k}
            className={`h-1 flex-1 rounded-full ${k <= i ? 'bg-[var(--accent)]' : 'bg-ov/15'}`}
          />
        ))}
      </div>
      <m.button
        type="button"
        onClick={() => (swiped.current ? (swiped.current = false) : go(1))}
        aria-label={label}
        drag={rm ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={() => (swiped.current = true)}
        onDragEnd={(_e, { offset, velocity }) => {
          // Cleared after the click that follows a release on the card; a release elsewhere sends none.
          setTimeout(() => (swiped.current = false));
          const far = Math.abs(offset.x) > SWIPE;
          const fast = Math.abs(velocity.x) > FLICK && velocity.x * offset.x > 0;
          if (far || fast) go(offset.x < 0 ? 1 : -1);
        }}
        className="glass glass-glow relative grid aspect-[9/14] w-[min(100%,26rem,calc(62svh*9/14))] place-items-center overflow-hidden p-8 text-center"
      >
        <AnimatePresence mode="wait" custom={dir}>
          <m.div
            key={i}
            custom={dir}
            variants={{
              from: (d: number) => side(d),
              here: { opacity: 1, x: 0, scale: 1 },
              to: (d: number) => side(-d),
            }}
            initial="from"
            animate="here"
            exit="to"
            transition={{ duration: SLIDE, ease: EASE }}
            className="flex flex-col items-center gap-4"
            aria-live="polite"
          >
            <m.span
              aria-hidden
              className="text-72"
              animate={rm ? undefined : { y: [0, -10, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {s.emoji}
            </m.span>
            <span className="text-15 font-bold uppercase tracking-[0.12em] text-[var(--accent-tx)]">
              {s.kicker}
            </span>
            {i === slides.length - 1 ? <Finale s={s} rm={rm} /> : <Value s={s} run />}
          </m.div>
        </AnimatePresence>
      </m.button>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled={!i}
          onClick={() => go(-1)}
          className="press glass min-h-12 rounded-2xl px-5 font-bold disabled:opacity-40"
        >
          {prev}
        </button>
        <button
          type="button"
          disabled={i === slides.length - 1}
          onClick={() => go(1)}
          className="press glass min-h-12 rounded-2xl px-5 font-bold disabled:opacity-40"
        >
          {next}
        </button>
      </div>
    </div>
  );
}
