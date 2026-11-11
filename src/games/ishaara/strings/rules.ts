/** How to play Ishaara, in our own words and with our own examples. */
export const rulesText = {
  title: 'How to play',
  intro:
    'Two teams, Sun and Moon, race to find their words on a grid of 25. One player on each team, the clue-giver, can see which word belongs to whom. They help their team with one-word hints.',
  legend: {
    title: 'The cards',
    sun: 'Sun’s word: a dot',
    moon: 'Moon’s word: a crescent',
    blank: 'Blank: stripes',
    trap: 'Trap: a cross',
    sample: { sun: 'MANGO', moon: 'RIVER', blank: 'CLOCK', trap: 'GHOST' },
  },
  setup: {
    title: 'Setting up',
    teams:
      'Split into two teams of at least two. Each team picks a clue-giver; everyone else guesses.',
    grid: 'The host’s screen shows 25 words. The team that starts has 9 to find, the other team 8. Seven are blanks and one is the trap.',
    key: 'Each clue-giver opens the key on their own phone. Nobody else should see it.',
  },
  clue: {
    title: 'Giving a clue',
    body: 'On your team’s turn, give one word and one number. The word links some of your team’s words; the number says how many.',
    example: 'Sun has RIVER and OCEAN. Their clue-giver sends “WATER · 2”.',
    zero: 'A 0 or ∞ lets your team guess as many times as they like. Use it to go back for words an earlier clue was meant for.',
    rules:
      'The clue is a single word (hyphens are fine), in English, Hindi or Hinglish. It can’t be a word still face down, a simple form of one (MANGOES while MANGO is hidden), or contain one (SUNLIGHT while SUN is hidden). The app blocks these as you type.',
  },
  guess: {
    title: 'Guessing',
    body: 'The team talks it over, taps a word and confirms. Every turn needs at least one pick; after that, the team may end the turn.',
    limit: 'With a clue of 1 to 9, the team can pick up to one more than the number.',
    example:
      'After “WATER · 2”, Sun picks RIVER: it’s theirs, so they go on. OCEAN: theirs too. They may take one more pick, or stop.',
  },
  pick: {
    title: 'What a pick does',
    own: 'Your team’s word: it’s found, and you may pick again.',
    other: 'The other team’s word: it’s found for them, and your turn ends.',
    blank: 'A blank: your turn ends.',
    trap: 'The trap: your team loses at once.',
  },
  challenge: {
    title: 'Clues that break the rules',
    body: 'Some clues the app can’t judge: rhymes, spelling hints, pointing at a spot on the grid, translating a word on the board. The other team’s clue-giver can tap Not allowed, up to the first pick.',
    penalty:
      'The turn then ends, and the challenging team’s clue-giver picks one of their own words to reveal for free. If they take more than a minute, the host can skip it.',
    stands: 'A rule-breaking clue nobody challenges stands.',
  },
  timer: {
    title: 'Timer',
    body: 'Off by default. With a 1, 2 or 3 minute timer, the clock starts when the clue is sent, and the turn ends when it runs out.',
  },
  win: {
    title: 'Winning',
    body: 'The first team with all its words face up wins, even if the other team turned up the last one.',
    trap: 'A team that picks the trap loses straight away.',
    match:
      'Play a single game or best of three. In a rematch the clue-giver passes to the next player on each team, and the team that went second starts.',
  },
} as const;
