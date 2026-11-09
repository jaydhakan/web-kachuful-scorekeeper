import type { KtLength, Rank, Suit } from '@/games/kaali-teeri/domain';

const GLYPH: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };

/** Kaali Teeri's end of game, menu, share and confirm strings. */
export const end = {
  game: 'Kaali Teeri',
  glyph: (s: Suit) => GLYPH[s],
  card: (rank: Rank, suit: Suit) => `${rank}${GLYPH[suit]}`,
  hands: (n: number) => `${n} ${n === 1 ? 'hand' : 'hands'}`,

  winner: {
    /** Under the headline: the hands played and how the winner's own bids went. */
    sub: (hands: number, made: number, bid: number) =>
      bid > 0
        ? `${end.hands(hands)} · made ${made} of ${bid} ${bid === 1 ? 'bid' : 'bids'}`
        : end.hands(hands),
    newGame: 'New game',
    empty: 'There’s no finished game to show.',
    standings: 'Final standings',
  },

  share: {
    /** The card's subtitle and the text summary's first line. */
    subtitle: (hands: number, finished: boolean) =>
      `${end.hands(hands)} · ${finished ? 'final scores' : 'scores so far'}`,
    empty: 'Scores can be shared once the first hand is done.',
    drawing: 'Drawing the scores card',
    drawFailed: 'Couldn’t draw the image. You can still copy the scores as text.',
  },

  menu: {
    title: 'Menu',
    sectionGame: 'This game',
    sectionApp: 'App',
    board: 'Scoreboard',
    rules: 'Rules',
    share: 'Share scores',
    undo: 'Undo last action',
    theme: 'Theme',
    allGames: 'All games',
    newGame: 'New game',
    finish: 'Finish game',
    abandon: 'Abandon game',
  },

  confirm: {
    finish: {
      text: 'Finish the game and crown the winner?',
      body: 'Totals stand as they are now.',
      ok: 'Finish game',
    },
    abandon: {
      text: 'Abandon this game?',
      body: 'It ends without a winner. Hands already scored stay in History.',
      ok: 'Abandon',
    },
    discard: {
      text: 'No hand was scored. Discard this game?',
      ok: 'Discard game',
    },
  },

  rules: {
    title: 'Rules',
    settings: 'This game',
    players: 'Players',
    decks: 'Decks',
    deck: (d: number) => `${d} ${d === 1 ? 'deck' : 'decks'} · ${250 * d} points`,
    minBid: 'Minimum bid',
    step: 'Bid step',
    partners: 'Partners',
    partnersN: (n: number) => `${n} called ${n === 1 ? 'card' : 'cards'}`,
    length: 'Game length',
    lengthName: (l: KtLength) => (l === 'to1000' ? 'First to 1000' : 'Endless'),
    direction: 'Direction',
    dirName: (cw: boolean) => (cw ? 'Clockwise' : 'Anticlockwise'),
    // Table headings
    colPlayers: 'Players',
    colDecks: 'Decks',
    colOut: 'Take out',
    colEach: 'Each',
    colPartners: 'Partners',
    none: 'Nothing',
    times: (n: number) => `×${n}`,
    thisTable: 'This table',
    colOutcome: 'Outcome',
    colTeam: 'Bidder & partners',
    colDefenders: 'Each defender',
  },
} as const;
