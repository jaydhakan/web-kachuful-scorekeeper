/** The site's own strings: the landing page, the game list and moving between games. No React, so they stay tiny. */
export const platform = {
  name: 'Baithak',
  tagline: 'Scorekeepers for the games at your table',
  description: 'Scorekeepers for the card and party games played around one table: Kachuful, Kaali Teeri and more.',
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
      description: 'Scorekeeper for Kaali Teeri (3 of Spades): bids, partners and points, worked out for you.',
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
  kachufulPeek: {
    round: (n: number, cards: number) => `Round ${n} · ${cards} ${cards === 1 ? 'card' : 'cards'}`,
    deals: (name: string) => `${name} deals`,
  },
} as const;
