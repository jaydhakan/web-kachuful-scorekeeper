import { m, useReducedMotion } from 'framer-motion';
import { RISE_EASE } from './podiumReveal';

interface InkFillProps {
  text: string;
  /**
   * `done`: filled at once. Timings (seconds): the name stays out of sight until `delay` (the podium has not named
   * the winner yet), then inks in over `duration`. Left out, the stylesheet's own slow fill plays.
   */
  fill?: 'done' | { delay: number; duration: number };
}

/**
 * The outline-to-fill headline (DESIGN-SYSTEM.md, Motion): the words draw as an outline, then the fill wipes in left to
 * right and holds. The fill is drawn from an attribute, so the text is in the page once. Reduced motion shows it filled.
 */
export function InkFill({ text, fill }: InkFillProps) {
  const rm = useReducedMotion();
  if (!fill)
    return (
      <span className="ink-fill" data-text={text}>
        {text}
      </span>
    );
  const run = fill !== 'done' && !rm ? fill : null;
  // No data-text here: the stylesheet's own fill has nothing to draw, and this one keeps the caller's timing.
  return (
    <m.span
      className="ink-fill"
      initial={run ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: run?.delay ?? 0 }}
    >
      {text}
      <m.span
        aria-hidden
        data-fill={text}
        initial={run ? { clipPath: 'inset(0% 100% 0% 0%)' } : false}
        animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
        transition={{ duration: run?.duration ?? 0, ease: RISE_EASE, delay: run?.delay ?? 0 }}
        style={{ WebkitTextStroke: 0 }}
        className="absolute inset-0 text-[var(--brand)] after:content-[attr(data-fill)]"
      />
    </m.span>
  );
}
