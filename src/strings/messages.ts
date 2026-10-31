/** Plain-text strings the domain and the reducer produce. No React, so the domain stays pure. */
export const messages = {
  tricksMismatch: (sum: number, cards: number) => `Tricks add up to ${sum} — should be ${cards}.`,
  allMade: "Someone has to miss — the bids can't all be right. Check again.",
  banner: {
    peak: (cards: number) => `Peak round — ${cards} cards!`,
    backTo3: 'Back to 3 — climbing again',
  },
  toasts: {
    bidSaved: 'Bid saved',
    roundSaved: 'Round saved',
    undone: 'Undone',
    previousReplaced: 'Previous game replaced',
    nothingToUndo: 'Nothing to undo',
    roundUpdated: (n: number) => `Round ${n} updated`,
    storageFull: 'Storage is full — this game may not be saved',
    storageOff: 'Saving is unavailable in this browser',
  },
} as const;
