import type { Transition } from 'framer-motion';

export const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
/** Something crossing the table: a spotlight, a stack of tricks. CSS twin: `TRAVEL` in `src/fx/waapi.ts`. */
export const TRAVEL: [number, number, number, number] = [0.65, 0, 0.35, 1];
/** Critically damped default. */
export const SPRING: Transition = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };
/** Only for momentum and confirmation. */
export const SPRING_POP: Transition = { type: 'spring', stiffness: 520, damping: 24, mass: 0.8 };
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 220, damping: 30 };
/** Sheets and side panels sliding in from an edge. */
export const SPRING_SHEET: Transition = { type: 'spring', stiffness: 360, damping: 38 };
/** Durations in seconds (Framer Motion's unit): a screen or card coming in, going out, and the reduced-motion fade. */
export const ENTER = 0.32;
export const EXIT = 0.24;
export const REDUCED = 0.15;
/** Press feedback for wide controls: buttons, rows, cards, chips. CSS twin: `.press`. */
export const PRESS = { scale: 0.97 };
/** Compact controls (icon buttons, keys, steppers, avatars) need a deeper press to read. CSS twin: `.press-sm`. */
export const PRESS_SM = { scale: 0.92 };
/**
 * The moments' timings in ms (WOW-MOMENTS-PLAN §2.2): a card turn, a stamp, how long a Beat is read, and a Moment's
 * ceiling (a game end may run longer). In ms, not seconds: moments run on Web Animations.
 */
export const FLIP_MS = 450;
export const STAMP_MS = 360;
export const BEAT_HOLD_MS = 900;
export const MOMENT_MAX_MS = 2500;
export const GAME_END_MAX_MS = 4000;
