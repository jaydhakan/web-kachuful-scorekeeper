/** How to play Spades, in plain words, as the app runs it (with the worked examples the scoring tests use). */

export interface RulesSection {
  title: string;
  /** Paragraphs, then bullet points. */
  body: readonly string[];
  points?: readonly string[];
}

/** One team's hand: partners P and Q. */
export interface RulesExample {
  bids: string;
  took: string;
  result: string;
  points: string;
  bags: number;
}

export const rulesText = {
  title: 'How to play Spades',
  intro:
    'Four players in two teams. Partners sit opposite each other. Each hand, every player bids how many tricks they’ll take; your team scores if, together, you take at least what you bid.',
  sections: [
    {
      title: 'The deal',
      body: [
        'One full deck, no jokers: 13 cards each. Spades are always trumps.',
        'The deal moves one seat clockwise each hand. Bidding and play both start with the player left of the dealer and go clockwise.',
      ],
    },
    {
      title: 'Bidding',
      body: [
        'Everyone bids once, from 0 to 13. Nobody can pass. Your team’s contract is the two bids added together.',
      ],
      points: [
        'A bid of 0 is Nil: you promise to take no tricks at all. Your partner’s bid stands on its own, and your Nil is scored separately.',
        'Blind Nil (when the table turns it on) is Nil declared before you look at your cards. It’s worth double.',
        'Minimum team bid (when the table turns it on): the second partner to bid can’t take the team below 4, unless one of you bids Nil.',
      ],
    },
    {
      title: 'Playing a trick',
      body: [
        'The player left of the dealer leads the first trick. Everyone else follows suit if they can.',
        'If you can’t follow suit, play any card. A spade played this way is a cut: it beats every card of the other three suits.',
        'The highest spade wins the trick. With no spade in it, the highest card of the suit that was led wins. The winner leads the next trick.',
      ],
    },
    {
      title: 'What “spades broken” means',
      body: [
        'Nobody may lead a spade (play one as the first card of a trick) until spades are broken.',
        'Spades break the first time someone who can’t follow suit cuts with a spade. From then on, anyone may lead them.',
      ],
      points: [
        'The lock is only on leading. Cutting with a spade is always allowed when you can’t follow suit; that is exactly what breaks them.',
        'A player holding nothing but spades may lead one. That breaks spades too.',
        'So the first lead of a hand is never a spade, unless that player holds only spades.',
      ],
    },
    {
      title: 'Scoring each hand',
      body: [
        'Made it: your team takes at least its contract and scores 10 points per trick bid, plus 1 for each trick over. Those extra tricks are bags.',
        'Set: your team takes fewer than its contract and loses 10 points per trick bid. A set earns no bags.',
      ],
      points: [
        'Nil made is +100, Nil failed −100. Blind Nil is +200 or −200. This is on top of the partner’s own result.',
        'Tricks taken by a Nil bidder never count toward the partner’s contract. They are always bags for the team, even when the partner is set.',
        'If both partners bid Nil, each is scored on their own, and every trick they take is a bag.',
      ],
    },
    {
      title: 'Bags',
      body: [
        'Bags add up across the whole game. Each time a team’s total passes a multiple of 10, it loses 100 points, and the rest carries on (9 bags plus 3 more is −100, with 2 carried).',
      ],
    },
    {
      title: 'Winning',
      body: [
        'The first team to reach the target (200 unless the table chose another, or Endless) at the end of a hand wins. If both teams get there in the same hand, the higher score wins.',
      ],
      points: [
        'A tie at the target means one more hand, until it breaks.',
        'Mercy rule (when the table turns it on): a team below −200 at the end of a hand loses. Exactly −200 doesn’t.',
        'In Endless, the host ends the game after the current hand, and the higher score wins.',
      ],
    },
  ] satisfies readonly RulesSection[],
  examples: {
    title: 'Worked examples',
    intro: 'One team, partners P and Q, in a single hand.',
    head: { bids: 'Bids', took: 'Tricks', result: 'What happens', points: 'Points', bags: 'Bags' },
    rows: [
      {
        bids: 'P 2, Q 3',
        took: 'P 4, Q 1',
        result: 'Made: 5 against 5. Who took which doesn’t matter.',
        points: '+50',
        bags: 0,
      },
      {
        bids: 'P 2, Q 3',
        took: 'P 4, Q 3',
        result: 'Made, 2 over',
        points: '+52',
        bags: 2,
      },
      {
        bids: 'P 2, Q 3',
        took: 'P 4, Q 0',
        result: 'Set: 4 against 5',
        points: '−50',
        bags: 0,
      },
      {
        bids: 'P Nil, Q 4',
        took: 'P 0, Q 5',
        result: 'Nil made +100. Q made 4 with 1 over, +41.',
        points: '+141',
        bags: 1,
      },
      {
        bids: 'P Nil, Q 4',
        took: 'P 2, Q 4',
        result: 'Nil failed −100. Q made 4, +40. P’s 2 tricks are bags, +2.',
        points: '−58',
        bags: 2,
      },
      {
        bids: 'P Nil, Q 4',
        took: 'P 2, Q 3',
        result: 'Nil failed −100. Q set, −40. P’s 2 tricks are still bags, +2.',
        points: '−138',
        bags: 2,
      },
      {
        bids: 'P Blind Nil, Q 5',
        took: 'P 0, Q 6',
        result: 'Blind Nil made +200. Q made 5 with 1 over, +51.',
        points: '+251',
        bags: 1,
      },
      {
        bids: 'P Blind Nil, Q 5',
        took: 'P 1, Q 5',
        result: 'Blind Nil failed −200. Q made 5, +50. P’s trick is a bag, +1.',
        points: '−149',
        bags: 1,
      },
    ] satisfies readonly RulesExample[],
    bagRun: {
      title: 'Bags over a game',
      intro: 'The same team over four hands:',
      head: { hand: 'Hand', bid: 'Bid', took: 'Took', points: 'Points', bags: 'Bags so far' },
      rows: [
        { hand: 1, bid: 5, took: 7, points: '52', bags: '2' },
        { hand: 2, bid: 4, took: 8, points: '44', bags: '6' },
        { hand: 3, bid: 6, took: 9, points: '63', bags: '9' },
        { hand: 4, bid: 3, took: 6, points: '33', bags: '12: −100, 2 carried' },
      ],
      total: 'The total is 92.',
    },
    minBid: 'Minimum team bid (when on): P bids 1, so Q must bid 3 or more, or Nil.',
  },
} as const;
