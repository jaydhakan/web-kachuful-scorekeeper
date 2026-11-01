/**
 * Runs `fn` once the main thread is idle after the first paint, for work the first screen does not need (Safari
 * has no requestIdleCallback, so it gets a timer). Returns a cancel function for effect cleanups.
 */
export function whenIdle(fn: () => void, timeout = 2000): () => void {
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(fn, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 1200);
  return () => clearTimeout(id);
}
