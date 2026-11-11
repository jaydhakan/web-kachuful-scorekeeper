/** Ishaara's root: the sign-in and connection gates, and the placeholder names of its screens. */
export const shell = {
  signIn: {
    title: 'Sign in to play',
    body: 'Ishaara runs on the server: the host and both clue-givers sign in, so the key stays secret.',
    action: 'Sign in',
  },
  offline: {
    title: 'Ishaara needs a connection',
    body: 'The server deals the words and keeps the key, so a game can’t start offline. Games you finished here are still in History.',
    history: 'History',
  },
  allGames: 'All games',
  screens: {
    home: 'Ishaara',
    setup: 'New game',
    waiting: 'Waiting for clue-givers',
    board: 'Board',
    win: 'Game over',
    'clue-list': 'Your games',
    key: 'Key',
    history: 'History',
  },
} as const;
