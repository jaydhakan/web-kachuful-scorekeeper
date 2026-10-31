import type { Transition } from 'framer-motion';

export const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
/** Critically damped default. */
export const SPRING: Transition = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 };
/** Only for momentum and confirmation. */
export const SPRING_POP: Transition = { type: 'spring', stiffness: 520, damping: 24, mass: 0.8 };
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 220, damping: 30 };
