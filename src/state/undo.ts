export const UNDO_LIMIT = 20;

/** Appends a snapshot, dropping the oldest once more than UNDO_LIMIT are held. */
export const pushSnapshot = (stack: string[], snap: string): string[] =>
  [...stack, snap].slice(-UNDO_LIMIT);
