import type { Suit } from '@/lib/cards';

/** The online table (`online/table`) and the pieces it shares with the scorekeeper (`ui/`): every word on screen. */

const SUIT_NAME: Record<Suit, string> = {
  spades: 'spades',
  hearts: 'hearts',
  diamonds: 'diamonds',
  clubs: 'clubs',
};
const SYM: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const sign = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

export const play = {
  sign,
  sym: SYM,
  suitName: SUIT_NAME,

  title: {
    hand: (n: number) => `Hand ${n}`,
    table: (code: string) => `Table ${code}`,
    target: (n: number | null) => (n === null ? 'Endless' : `to ${n}`),
    loading: 'Opening the table…',
  },

  team: {
    us: 'Us',
    them: 'Them',
    /** A team named by its players, for someone watching. */
    pair: (a: string, b: string) => `${a} & ${b}`,
    aria: (team: string, names: string, score: number) => `${team}, ${names}: ${score} points`,
    bidding: 'bidding…',
    doubleNil: 'double Nil',
    meter: (took: number, contract: number) => `${took}/${contract}`,
    meterAria: (took: number, contract: number) => `${took} of ${contract} tricks`,
    bags: (n: number) => `${n}/10`,
    bagsAria: (n: number) => `${plural(n, 'bag')} toward the next 10`,
    made: 'Contract made',
    set: (pts: number) => `SET ${sign(pts)}`,
    minus100: '−100',
  },

  seat: {
    you: 'You',
    empty: 'Open seat',
    noBid: '–',
    bid: (took: number, bid: number) => `${took} / ${bid}`,
    nil: (blind: boolean, took: number) => `${blind ? 'BLIND NIL' : 'NIL'} · ${took}`,
    bubbleBid: (n: number) => `Bid ${n}`,
    bubbleNil: (blind: boolean) => (blind ? 'BLIND NIL' : 'NIL'),
    dealer: 'D',
    dealerAria: 'deals',
    away: 'away',
    left: (n: number) => plural(n, 'card'),
    invited: 'Invited…',
    aria: (o: {
      name: string;
      team: string;
      bid: string;
      cards: number;
      dealer: boolean;
      turn: boolean;
      away: boolean;
    }) =>
      [
        o.name,
        o.team,
        o.bid,
        plural(o.cards, 'card') + ' left',
        o.dealer ? 'dealer' : '',
        o.turn ? 'to play' : '',
        o.away ? 'away' : '',
      ]
        .filter(Boolean)
        .join(', '),
    bidAria: (bid: number | null, took: number, blind: boolean) =>
      bid === null
        ? 'no bid yet'
        : bid === 0
          ? `${blind ? 'Blind Nil' : 'Nil'}, ${plural(took, 'trick')} taken`
          : `bid ${bid}, ${plural(took, 'trick')} taken`,
    partner: 'your partner',
    opponent: 'opponent',
  },

  chip: {
    locked: '♠ locked',
    broken: '♠ broken',
    lockedTip: 'Spades can’t be led until someone cuts with one',
    brokenTip: 'Spades can now be led',
    banner: '♠ Spades broken',
  },

  centre: {
    lastTrick: 'Show the last trick',
    lastTrickTitle: 'Last trick',
    lastTrickWon: (name: string) => `${name} took it`,
    noTrick: 'No trick has been played yet.',
    dealing: (name: string) => `${name} is dealing`,
    yourDeal: 'Your deal',
    waitBids: 'Bidding…',
    paused: (name: string) => `Waiting for someone to take ${name}’s seat`,
    pausedNoName: 'Waiting for someone to take the open seat',
    reconnecting: 'Reconnecting…',
    checking: 'Checking the table…',
  },

  hand: {
    label: 'Your hand',
    yourTurn: 'YOUR TURN',
    yourTurnSecs: (s: number) => `YOUR TURN · ${s}s`,
    faceDown: 'Face-down card',
    cant: {
      'must-follow': (suit: Suit) => `Follow ${SYM[suit]} ${SUIT_NAME[suit]} while you have them`,
      'spades-locked': 'Spades aren’t broken yet',
      'not-in-hand': 'That card isn’t in your hand',
    },
    cantAria: {
      'must-follow': (suit: Suit) => `can’t play: must follow ${SUIT_NAME[suit]}`,
      'spades-locked': 'can’t lead spades yet',
      'not-in-hand': 'not in your hand',
    },
    notTurn: 'Not your turn yet',
    lift: 'Tap again or drag up to play',
  },

  deal: {
    hold: 'Hold to shuffle & deal',
    holdHint: 'Your deal. Press and hold.',
    anyone: 'Hold to deal for them',
    anyoneHint: (name: string) => `${name} hasn’t dealt. Anyone can deal now.`,
    skip: 'Skip the deal',
  },

  gate: {
    look: 'Look at cards',
    blind: 'Blind Nil · +200 / −200',
    note: 'Blind Nil is only offered before you look.',
    blindSet: 'Blind Nil: your cards stay face down until your bid is made.',
  },

  bid: {
    title: 'Your bid',
    group: 'Pick your bid',
    nil: 'Nil',
    key: (n: number) => (n === 0 ? 'Nil' : String(n)),
    keyAria: (n: number, why: string | null) =>
      `${n === 0 ? 'Nil' : n}${why ? `, not allowed: ${why}` : ''}`,
    pick: 'Pick a bid',
    go: (n: number) => (n === 0 ? 'Bid Nil · +100 / −100' : `Bid ${n}`),
    partnerAfter: (name: string) => `${name} bids after you.`,
    partnerNil: (name: string) => `${name} bid Nil. Your bid is the team’s contract.`,
    partnerBid: (name: string, n: number) => `${name} bid ${n}. Team: ${n} + yours.`,
    partnerMin: (name: string, n: number, min: number, team: number) =>
      `${name} bid ${n}. Team needs ${team}: bid ${min}+ or Nil.`,
    nilOff: 'Nil is off at this table',
    belowMin: (team: number) => `the team needs ${team}`,
    keysHint: 'Type 0–13, then Enter',
  },

  reasons: {
    'must-follow': 'You have to follow suit',
    'spades-locked': 'Spades aren’t broken yet',
    'not-in-hand': 'That card isn’t in your hand',
    'below-min': 'That bid takes the team below the minimum',
    'nil-off': 'Nil is off at this table',
    'look-first': 'Look at your cards first',
    'wrong-phase': 'That can’t be done right now',
    'not-your-turn': 'It isn’t your turn',
    paused: 'The game is paused',
    'mid-trick': 'Wait for this trick to finish',
    'not-away': 'That seat isn’t away',
    stale: 'The table moved on. Try again.',
    offline: 'You’re offline. Try again when you’re back.',
    generic: 'That didn’t go through. Try again.',
  } as Record<string, string>,

  timeout: {
    myBid: (n: number) => `Time’s up: you bid ${n}`,
    myPlay: 'Time’s up: your lowest card was played',
    theirBid: (name: string, n: number) => `Time’s up: ${name} bid ${n}`,
    theirPlay: (name: string) => `Time’s up: ${name}’s lowest card was played`,
  },

  announce: {
    bid: (name: string, bid: number, blind: boolean) =>
      `${name} bid ${bid === 0 ? (blind ? 'Blind Nil' : 'Nil') : bid}.`,
    played: (name: string, card: string) => `${name} played the ${card}.`,
    broken: 'Spades are broken.',
    cut: (name: string) => `${name} cut with a spade.`,
    trick: (name: string) => `${name} won the trick.`,
    yourTurn: 'Your turn.',
    yourBid: 'Your turn to bid.',
    made: (team: string) => `${team} made the contract.`,
    nilBroken: (name: string) => `${name}’s Nil is broken.`,
    nilMade: (name: string, blind: boolean) => `${name} made ${blind ? 'Blind ' : ''}Nil!`,
    burst: (team: string) => `Ten bags: ${team} lose 100.`,
    dealt: (name: string) => `${name} dealt. Bidding starts.`,
    handOver: (n: number) => `Hand ${n} is over.`,
    won: (team: string) => `${team} win the game.`,
    draw: 'The game is a draw.',
    reaction: (name: string, emoji: string) => `${name}: ${emoji}`,
  },

  pops: {
    /** A moment earned by someone no longer at the table. */
    someone: 'Someone',
  },
  /** The table's big moments (WOW-MOMENTS-PLAN S1–S3). */
  moment: {
    boston: 'Boston',
    /** Under the stamp: the team that took all 13, and the other side's quieter line. */
    bostonUs: (team: string) => `${team} took all 13 tricks`,
    bostonThem: (team: string) => `Bostoned by ${team}`,
    lastTrick: 'Last trick decides it',
    blindNil: (name: string) => `${name} goes Blind Nil`,
  },
  toast: {
    nilBroken: (name: string) => `${name}’s Nil is broken`,
    nilMade: (name: string, blind: boolean) => `${name} made ${blind ? 'Blind ' : ''}Nil!`,
    burst: (team: string) => `10 bags: ${team} lose 100`,
    replaced: (name: string) => `${name}’s seat is open. Invite someone to take it.`,
    invited: (name: string) => `Invite sent to ${name}`,
    inviteFailed: 'Couldn’t send the invite',
    copied: 'Copied to the clipboard',
  },

  reactions: {
    open: 'Send a reaction',
    close: 'Close reactions',
    group: 'Reactions',
    send: (emoji: string) => `Send ${emoji}`,
  },

  menu: {
    open: 'Table menu',
    title: 'Table',
    scoreboard: 'Scoreboard',
    lastTrick: 'Last trick',
    prefs: 'Sounds and sorting',
    rules: 'Rules',
    leave: 'Leave the table',
    leaveBody: 'The game goes on without you; you can come back from Spades home.',
    host: 'Host',
    endGame: 'End game',
    endGameBody:
      'It ends now. Completed hands count, the hand in progress is dropped, and the higher total wins.',
    endGameOk: 'End the game',
    draw: 'Call it a draw',
    drawBody: 'It ends now as a draw for both teams.',
    drawOk: 'Call it a draw',
    cancel: 'Cancel game',
    cancelBody: 'No result, and it won’t count anywhere.',
    cancelOk: 'Cancel the game',
    keep: 'Keep playing',
    replace: (name: string) => `Replace ${name}`,
    replaceSub: 'Away. Opens their seat for an invite.',
    replaceText: (name: string) => `Replace ${name}?`,
    replaceBody: (name: string) =>
      `${name} leaves the table. The game pauses until someone you invite takes their seat and cards.`,
    replaceOk: 'Replace',
    replaceWait: 'Between tricks only',
    inviteSeat: 'Invite someone',
    inviteTitle: (name: string) => `Take ${name}’s seat`,
    inviteSub: 'They take over this hand and this team’s score.',
    shortcuts: 'Keyboard shortcuts',
  },

  prefs: {
    title: 'Sounds and sorting',
    sort: 'Sort your hand',
    sortUp: 'Low to high',
    sortDown: 'High to low',
    sounds: 'Sounds',
    soundsAll: 'Everyone’s',
    soundsMine: 'Only mine',
    soundsOff: 'Off',
    soundsNote:
      'Only mine plays your turn, your cards, your team’s tricks, a Nil involving you and the win.',
  },

  board: {
    title: 'Scoreboard',
    hand: 'Hand',
    bids: 'Bids',
    took: 'Took',
    pts: 'Points',
    total: 'Total',
    none: 'No hands finished yet.',
    tricks: 'This hand’s tricks',
    noTricks: 'No tricks yet this hand.',
    trickN: (n: number) => `Trick ${n}`,
  },

  keys: {
    title: 'Keyboard shortcuts',
    move: '← →',
    moveText: 'Move through your hand',
    play: 'Enter',
    playText: 'Play the card, or place the bid',
    bid: '0–9',
    bidText: 'Pick a bid (type two digits for 10 to 13)',
    last: 'L',
    lastText: 'Show the last trick',
    help: '?',
    helpText: 'This list',
  },

  summary: {
    title: (n: number) => `Hand ${n}`,
    bids: 'Bids',
    contract: 'Contract',
    took: 'Took',
    result: 'Result',
    made: 'MADE',
    set: 'SET',
    contractPts: 'Contract points',
    nil: (name: string, blind: boolean) => `${name} ${blind ? 'Blind ' : ''}Nil`,
    bags: 'Bags',
    penalty: '10-bag penalty',
    thisHand: 'This hand',
    total: 'Total',
    carried: 'Bags carried',
    carriedVal: (n: number) => `${n}/10`,
    bidOf: (name: string, bid: string) => `${name} ${bid}`,
    nilBid: (blind: boolean) => (blind ? 'Blind Nil' : 'Nil'),
    dash: '—',
    allHands: 'Show all four hands',
    target: (n: number | null) => (n === null ? 'Endless game.' : `First to ${n}.`),
    tie: 'Tied at the target: one more hand.',
    wins: (team: string) => `${team} win the game!`,
    next: 'Next hand',
    close: 'Done',
    winner: 'See the winner',
    waitDeal: (name: string) => `${name} deals next.`,
  },

  winner: {
    title: (team: string) => `${team} win!`,
    draw: 'It’s a draw',
    cancelled: 'Game cancelled',
    cancelledBody: 'The host cancelled this game. It won’t count anywhere.',
    names: (a: string, b: string) => `${a} & ${b}`,
    madeStat: 'bids made',
    nilStat: 'Nil',
    bagsStat: 'bags',
    bestStat: 'best hand',
    bestVal: (pts: number, hand: number) => `${sign(pts)} · hand ${hand}`,
    ratio: (a: number, b: number) => `${a}/${b}`,
    rematch: 'Rematch · same partners',
    swap: 'Swap partners',
    share: 'Share',
    shareText: (o: { a: string; b: string; sa: number; sb: number; winner: string | null }) =>
      `Spades: ${o.a} ${o.sa} – ${o.b} ${o.sb}${o.winner ? `. ${o.winner} win!` : '. A draw.'}`,
    waitRematch: (host: string) => `Waiting for ${host} to start a rematch`,
    join: 'Join the rematch',
    home: 'Back to Spades',
    endedBy: {
      target: (n: number | null) => (n === null ? '' : `First to ${n}`),
      mercy: 'Mercy rule',
      end: 'Ended by the host',
      draw: 'Called a draw',
    },
  },
} as const;

export type PlayStrings = typeof play;
