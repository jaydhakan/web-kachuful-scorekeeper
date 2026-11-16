import type { SpRules } from '../domain';

/** Online play: opening a table, the lobby, the rules line and sheet, your tables and the live view. */

/** "200 points · Nil · 30 s turns": the rules in one line. Table mode leaves out the timer. */
export function rulesSummary(r: SpRules, online: boolean): string {
  const parts = [r.target === null ? 'Endless' : `${r.target} points`];
  parts.push(r.nil ? 'Nil' : 'No Nil');
  if (r.nil && r.blindNil) parts.push('Blind Nil');
  if (r.minTeamBid !== null) parts.push(`Team bid ${r.minTeamBid}+`);
  if (r.mercy !== null) parts.push('Mercy rule');
  if (online) parts.push(r.timerSec === null ? 'No timer' : `${r.timerSec} s turns`);
  return parts.join(' · ');
}

export const rulesSheet = {
  title: 'Table rules',
  nameLabel: 'Table name',
  nameError: 'A table name needs 1 to 40 characters.',
  editableOnline: 'Everyone at the table sees these. They lock when the first hand is dealt.',
  editableTable: 'These apply to the whole game. They lock once the first hand is scored.',
  readOnly: (host: string) => `Only ${host} can change these.`,
  game: 'Game',
  playTo: 'Play to',
  endless: 'Endless',
  custom: 'Custom',
  less: 'Lower the target by 10',
  more: 'Raise the target by 10',
  customValue: (n: number) => `${n} points`,
  timer: 'Turn timer',
  timerOff: 'Off',
  seconds: (n: number) => `${n} s`,
  bidding: 'Bidding',
  nil: 'Nil',
  nilSub: 'Bid 0 and take no tricks: +100 or −100',
  blindNil: 'Blind Nil',
  blindNilSub: 'Nil before seeing your cards: +200 or −200',
  blindNeedsNil: 'Turn on Nil first',
  minBid: 'Minimum team bid 4',
  minBidSub: 'Unless a partner bids Nil',
  ending: 'Ending',
  mercy: 'Mercy rule',
  mercySub: 'A team below −200 loses',
  reset: 'Reset to standard',
  resetDone: 'Back to the standard rules.',
  done: 'Done',
  close: 'Close',
} as const;

export const rulesLine = {
  edit: 'Edit rules',
  view: 'View',
  aria: (summary: string, editable: boolean) =>
    `Rules: ${summary}. ${editable ? 'Edit rules' : 'View the rules'}`,
} as const;

/** What a refused action means, for a toast. Anything unknown gets `fallback`. */
const REFUSAL: Record<string, string> = {
  offline: 'Not sent: you’re offline. Try again when you’re back.',
  stale: 'The table moved on. Here’s where it is now.',
  not_your_turn: 'That isn’t yours to do right now.',
  'not-ready': 'Everyone needs to be seated and ready first.',
  'seat-taken': 'Someone just took that chair.',
  full: 'That table is full.',
  started: 'The game has started.',
  'bad-rules': 'Those rules can’t be used.',
  rate_limited: 'Slow down a moment.',
};
export const refusalText = (reason: string | null): string | null =>
  reason === null ? null : (REFUSAL[reason] ?? 'That didn’t go through. Try again.');

export const online = {
  back: 'Back to Spades',
  reconnecting: 'Reconnecting…',
  open: {
    creating: 'Setting up your table…',
    joining: (code: string) => `Finding table ${code}…`,
    loading: 'Opening the table…',
  },
  error: {
    title: 'The table didn’t load',
    body: 'Check the connection and try again.',
    createTitle: 'Couldn’t start a table',
    joinTitle: (code: string) => `Couldn’t join table ${code}`,
    unknownCode: (code: string) =>
      `There’s no open table with the code ${code}. Check it on the host’s phone.`,
    full: 'All four chairs are taken.',
    started: 'That game has already started.',
    noPlayer: 'Your account needs a player first. Ask the person who invited you.',
    retry: 'Try again',
    goneTitle: 'This table has closed',
    goneBody: 'It finished, or the host ended it.',
  },
  lobby: {
    subtitleHost: 'Invite three people, or share the code',
    subtitleWaiting: 'Waiting for players',
    subtitleFull: 'Everyone’s here',
    leave: 'Leave the lobby',
    codeLabel: 'Room code',
    codeAria: (code: string) => `Room code ${code.split('').join(' ')}`,
    codeHint: 'For people in the room: Spades › Join with code',
    copyCode: 'Copy code',
    copied: 'Copied',
    copyFailed: 'Couldn’t copy',
    scan: 'Scan to join',
    orShare: (url: string) => `or share ${url}`,
    shareLink: 'Share link',
    copyLink: 'Copy link',
    shareText: (name: string) => `Join ${name} on Spades`,
    qrAlt: (code: string) => `QR code that opens table ${code}`,
    qrLoading: 'Loading the QR code…',
    table: 'The table',
    you: 'You',
    host: 'host',
    partner: 'Your partner',
    opponent: 'Opponent',
    empty: 'Empty',
    invite: 'Invite',
    inviteAria: (place: string) => `Invite someone to the ${place} chair`,
    sitHere: 'Sit here',
    sitAria: (place: string) => `Sit in the ${place} chair`,
    place: { N: 'top', W: 'left', E: 'right', S: 'bottom' } as Record<string, string>,
    invited: 'Invited…',
    invitedAria: (name: string) => `${name} is invited. Cancel the invite`,
    invitedGuestAria: (name: string) => `${name} is invited`,
    away: 'Not connected',
    readyMark: 'Ready',
    seatAria: (name: string, ready: boolean, away: boolean, band: string) =>
      [name, band, ready ? 'ready' : 'not ready yet', away ? 'not connected' : '']
        .filter(Boolean)
        .join(', '),
    ready: 'I’m ready',
    notReady: 'Not ready',
    shuffle: 'Shuffle partners',
    shuffled: (name: string) => `Partners shuffled: you’re with ${name}`,
    shuffledGuest: 'The host shuffled the partners',
    draw: 'Draw for deal',
    drawing: 'Drawing…',
    waitPlayers: 'Waiting for players…',
    waitConnected: 'Waiting for everyone to connect…',
    waitReady: 'Waiting for everyone to be ready…',
    guestDeals: (host: string) => `${host} deals when everyone is ready`,
    guestDrawing: (host: string) => `${host} is drawing for deal…`,
    joined: (name: string) => `${name} joined`,
    cantJoin: (name: string) => `${name} can’t join`,
    inviteSent: (name: string) => `Invite sent to ${name}`,
    cancelled: (name: string) => `Invite to ${name} cancelled`,
    rulesChanged: 'The rules changed',
  },
  invite: {
    title: 'Invite to this seat',
    partner: 'They will be your partner.',
    opponent: 'They will play against you.',
    moveHere: 'Move here',
    moveHereSub: 'Sit in this chair yourself',
    cancelTitle: (name: string) => `Invite to ${name}`,
    cancelBody: (name: string) =>
      `${name} hasn’t answered yet. The invite stays open for 30 minutes.`,
    cancel: 'Cancel invite',
    keep: 'Keep waiting',
  },
  draw: {
    dealer: 'Dealer',
    youDeal: (card: string) => `You drew the ${card}. You deal first.`,
    theyDeal: (name: string, card: string) => `${name} drew the ${card} and deals first.`,
  },
  active: {
    title: 'Your tables',
    loading: 'Looking for your tables…',
    failed: 'Your tables didn’t load.',
    retry: 'Try again',
    lobby: (seated: number) => `In the lobby · ${seated} of 4 seated`,
    hand: (n: number) => `Hand ${n}`,
    score: (a: string, b: string) => `${a} – ${b}`,
    yourTurn: 'Your turn',
    open: (name: string) => `Open ${name}`,
  },
  live: {
    title: 'Spades · Live',
    loading: 'Opening the live table…',
    goneTitle: 'This live link has ended',
    goneBody: 'The game finished, or the link was turned off.',
    failed: 'The live table didn’t load.',
    retry: 'Try again',
    hand: (n: number) => `Hand ${n}`,
    lobby: 'Waiting for the deal',
    finished: 'Game over',
    bid: (n: number | null) => (n === null ? '–' : n === 0 ? 'Nil' : String(n)),
    tricks: (won: number, bid: number | null) =>
      bid === null ? `${won} tricks` : `${won} of ${bid === 0 ? 'Nil' : bid}`,
    trick: 'The trick on the table',
    lastTrick: 'Last trick',
    noTrick: 'Waiting for the lead',
    team: (a: string, b: string) => `${a} & ${b}`,
    spadesBroken: 'Spades broken',
    spadesLocked: 'Spades locked',
    turn: (name: string) => `${name} to play`,
    reconnecting: 'Reconnecting…',
  },
  share: {
    recapTitle: 'Spades · Recap',
    hands: (n: number) => (n === 1 ? '1 hand played' : `${n} hands played`),
    won: (team: string) => `${team} won`,
    draw: 'A draw',
    cancelled: 'This game was cancelled',
    bags: (n: number) => `${n} of 10 bags`,
    teamAria: (team: string, score: number) => `${team}: ${score} points`,
  },
  play: {
    title: 'The game is on',
    body: 'The table opens here.',
  },
} as const;
