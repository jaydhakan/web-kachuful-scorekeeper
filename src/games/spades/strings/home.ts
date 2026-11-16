/** Spades' home (`/spades`): what each card says, the join sheet, and the placeholders the next screens replace. */
export const home = {
  name: 'Spades',
  tagline: 'Bid it. Make it. Don’t get sandbagged.',
  allGames: 'All games',
  online: {
    tag: '4 phones',
    title: 'Play online',
    body: 'Everyone holds their own 13 cards on their own phone. The table deals, checks every play and keeps score.',
    start: 'Start a table',
    join: 'Join with code',
    signIn: 'Sign in to play online',
    signInBody:
      'Online tables are for signed-in players. The scorekeeper below works without an account.',
    signInJoin: (code: string) => `Sign in to join table ${code}`,
    signInJoinBody: (code: string) =>
      `You were invited to table ${code}. Sign in and you’ll come straight back to it.`,
    offline: 'Online play needs a connection',
    offlineBody: 'You’re offline. The scorekeeper below still works, and saves on this device.',
  },
  resume: {
    title: (hand: number) => `At the table · Hand ${hand}`,
    score: (team: string, score: string) => `${team} ${score}`,
    aria: (hand: number) => `Resume the game at the table, hand ${hand}`,
  },
  keep: {
    title: 'Keep score at a real table',
    body: 'A real deck on a real table. One phone records bids and tricks. Works offline.',
    open: 'Open the scorekeeper',
  },
  links: {
    nav: 'History, leaderboard and rules',
    history: 'History',
    leaderboard: 'Leaderboard',
    rules: 'Rules',
  },
  join: {
    title: 'Join a table',
    body: 'Type the code on the host’s phone.',
    label: 'Table code',
    hint: 'Letters and numbers, never I, O, 0 or 1.',
    notInCodes: (ch: string) => `${ch} is never in a table code.`,
    go: 'Join table',
  },
  rulesTitle: 'How to play Spades',
  rulesLoading: 'Loading the rules…',
  rulesFailed: 'The rules didn’t load. Check the connection and try again.',
  retry: 'Try again',
  soon: {
    online: 'Online tables are coming',
    onlineBody: 'Starting and joining tables arrives with the next update.',
    table: 'The scorekeeper is coming',
    tableBody: 'Keeping score at a real table arrives with the next update.',
    back: 'Back to Spades',
  },
} as const;
