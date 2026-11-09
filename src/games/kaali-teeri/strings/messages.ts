/** Kaali Teeri's plain-text strings for the reducer and the landing card. No React, so peek() stays tiny. */
export const ktMessages = {
  toasts: {
    bidSaved: (name: string, bid: number) => `${name} · ${bid}`,
    handSaved: (n: number) => `Hand ${n} saved`,
    handUpdated: (n: number) => `Hand ${n} updated`,
    undone: 'Undone',
    nothingToUndo: 'Nothing to undo',
    previousSaved: 'Previous game saved to History',
    gameEnded: 'Game ended and saved to History',
    storageFull: 'Storage is full — this game may not be saved',
    storageOff: 'Saving is unavailable in this browser',
  },
  banner: {
    won: (name: string, bid: number) => `${name} wins the bid at ${bid}`,
    forced: (name: string, bid: number) => `Nobody bid — ${name} takes it at ${bid}`,
  },
  peek: {
    hand: (n: number) => `Hand ${n}`,
    deals: (name: string) => `${name} deals`,
    bid: (name: string, bid: number) => `${name} bid ${bid}`,
  },
} as const;
