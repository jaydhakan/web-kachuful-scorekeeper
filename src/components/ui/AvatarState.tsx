import { m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { EASE } from './motion';

export type AvatarMood = 'smug' | 'sulk';

const GLYPH: Record<AvatarMood, string> = { smug: '✨', sulk: '☁️' };

/**
 * An avatar's mood after the reveal (REWARDS-PLAN §5.2): the leader turns smug (a sparkle and a 3° tilt, once), last
 * place sulks (a cloud, sunk 3px until the next reveal). Transform and opacity only; reduced motion keeps the glyph,
 * still. The glyph is decoration: the standings say the same in words.
 */
export function AvatarState({ mood, children }: { mood: AvatarMood | null; children: ReactNode }) {
  const rm = useReducedMotion();
  return (
    <m.span
      data-mood={mood ?? undefined}
      className="relative inline-grid shrink-0"
      initial={false}
      animate={
        rm || !mood
          ? { rotate: 0, y: 0 }
          : mood === 'smug'
            ? { rotate: [0, 3, 0], y: 0 }
            : { rotate: 0, y: 3 }
      }
      transition={{ duration: 0.45, ease: EASE }}
    >
      {children}
      {/* Drawn by CSS (index.css, .mood-glyph) so the glyph never joins the row's text. */}
      {mood && <span aria-hidden className="mood-glyph" data-glyph={GLYPH[mood]} />}
    </m.span>
  );
}

/** The mood a standings row shows: smug for a sole leader, sulking for sole last from round 3 on. */
export function moodOf(rank: number, ranks: readonly number[], round: number): AvatarMood | null {
  const sole = (r: number) => ranks.filter((x) => x === r).length === 1;
  if (rank === 1 && sole(1) && ranks.length > 1) return 'smug';
  const last = Math.max(...ranks);
  if (round >= 3 && rank === last && last > 1 && sole(last)) return 'sulk';
  return null;
}
