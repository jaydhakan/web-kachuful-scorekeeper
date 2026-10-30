import { SPRING_SOFT } from './motion';

export const stagger = (i: number, base = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { ...SPRING_SOFT, delay: base + i * 0.05 },
});

export const shakeKF = { x: [0, -6, 6, -6, 6, 0], transition: { duration: 0.3 } };
