/** "Sounds and vibration" on the Me page: this device's setting for every game (Spades keeps its own at the table). */
export const fx = {
  title: 'Sounds and vibration',
  sounds: 'Sounds',
  soundsAll: 'All',
  soundsMoments: 'Big moments',
  soundsOff: 'Off',
  soundsNote: {
    all: 'Every moment makes a sound, the small ones too.',
    moments: 'Only the rare moments make a sound: a game won, a Boston, a big unlock.',
    off: 'No sounds.',
  },
  spadesNote: 'Spades has its own sound setting at the table, and it wins there.',
  vibrate: 'Vibration',
  vibrateHint: 'Android phones only: iPhones don’t let web apps vibrate.',
} as const;
