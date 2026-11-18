/**
 * Whether moments play their still versions, and how fast (the moments lab's switches). Kept apart from `waapi.ts`
 * so the shared first-load chunk (a count-up, confetti) can ask without carrying the animation helpers.
 */
let forced: boolean | null = null;
/** The moments lab's reduced-motion switch; null follows the system again. */
export const forceReducedMotion = (v: boolean | null) => {
  forced = v;
};
export const reducedMotion = () =>
  forced ??
  (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

let rate = 1;
/** The moments lab's speed (0.25 to watch a moment slowly); 1 everywhere else. */
export const setTimeScale = (r: number) => {
  rate = r;
};
export const timeScale = () => rate;
