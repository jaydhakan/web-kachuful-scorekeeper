/** Particles grow with the screen so a big window is not sparse and a phone is not crowded: 150 up to 300. */
export const confettiCount = (width: number, height: number): number =>
  Math.round(Math.min(300, Math.max(150, (width * height) / 4400)));
