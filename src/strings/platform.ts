/** The site's own strings: the landing page, the game list and moving between games. No React, so they stay tiny. */
export const platform = {
  name: 'Baithak',
  tagline: 'Scorekeepers for the games at your table',
  description:
    'Scorekeepers for the card and party games played around one table: Kachuful, Kaali Teeri and more.',
  games: {
    kachuful: {
      name: 'Kachuful',
      pitch: 'Bid the tricks you’ll take, then take exactly that many.',
      players: '3–14 players',
      description: 'Scorekeeper for the Judgement / Kachuful card game.',
    },
    'kaali-teeri': {
      name: 'Kaali Teeri',
      pitch: 'Win the auction, call your partners, chase the 3 of Spades.',
      players: '4–10 players',
      description:
        'Scorekeeper for Kaali Teeri (3 of Spades): bids, partners and points, worked out for you.',
    },
    ishaara: {
      name: 'Ishaara',
      pitch: 'Give clues without saying the word.',
      players: '4–12 players',
      description: 'A word game for teams, played around one table.',
    },
  },
  loadFailed: {
    title: 'This game didn’t load',
    body: 'It hasn’t been saved for offline use on this device yet. Connect to the internet and try again.',
    retry: 'Try again',
    home: 'All games',
  },
  allGames: 'All games',
  allGamesHint: 'Back to Baithak · your game stays saved',
  landing: {
    title: 'Pick a game',
    intro:
      'Scorekeepers for the games you play at a real table. One screen deals, checks the rules and keeps score, so everyone just plays.',
    inProgress: 'Pick up where you left off',
    games: 'Games',
    play: 'Play',
    resume: 'Resume',
    soon: 'Coming soon',
    signInToPlay: 'Sign in to play',
    saved: (ago: string) => `saved ${ago}`,
    resumeAria: (name: string) => `Resume ${name}`,
    soonAria: (name: string) => `${name}, coming soon`,
    offline: 'Offline · games still save on this device',
    signIn: 'Sign in',
    account: (name: string) => `Account: ${name}`,
    menu: 'Menu',
  },
  menu: {
    title: 'Menu',
    account: 'Your account',
    accountHint: 'One account for every game',
    signIn: 'Sign in',
    signInHint: 'Invite only · your games sync across devices',
    theme: 'Theme',
    adminsOnly: 'Admins only',
    themeHint: 'Sets the look for everyone using this app. Players don’t see this section.',
    ownTheme: 'Your theme',
    followAdmin: 'Same as everyone',
    credits: 'Credits',
  },
  kachufulPeek: {
    round: (n: number, cards: number) => `Round ${n} · ${cards} ${cards === 1 ? 'card' : 'cards'}`,
    deals: (name: string) => `${name} deals`,
  },
} as const;
