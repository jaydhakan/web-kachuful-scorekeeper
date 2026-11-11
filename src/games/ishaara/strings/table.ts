import type { ClueNumber, EndedBy, Identity, Team } from '@/games/ishaara/domain';

/** The table screens' words (the host's device): hub, setup, waiting, board, win. */

const TEAM: Record<Team, string> = { sun: 'Sun', moon: 'Moon' };
const num = (n: ClueNumber) => (n === 'inf' ? '∞' : String(n));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const table = {
  team: TEAM,
  num,
  clock,

  home: {
    name: 'Ishaara',
    tagline: 'Two teams, one word, a number',
    nav: 'Ishaara',
    newGame: 'New game',
    clueGames: 'Your clue games',
    history: 'History',
    leaderboard: 'Leaderboard',
    rules: 'How to play',
    allGames: 'All games',
    inProgress: 'In progress',
    loading: 'Looking for games in progress',
    loadFailed: 'Couldn’t check for games in progress.',
    retry: 'Try again',
    waiting: 'Waiting for clue-givers',
    playing: (sun: number, moon: number) => `Sun ${sun} left · Moon ${moon} left`,
    open: 'Open',
    yourClues: (team: Team) => `You give ${TEAM[team]}’s clues`,
  },

  setup: {
    back: 'Back',
    stepOf: (n: number) => `Step ${n} of 3`,
    teamsTitle: 'Teams',
    teamsHint:
      'Tap a name to move them. Pick one clue-giver per team; only signed-in players can be one.',
    you: (name: string) => `${name} (you)`,
    clueGiver: 'Clue-giver',
    guesser: 'Guesser',
    // Starts with what the row shows (name, then role), so the spoken name matches the visible one.
    move: (name: string, role: string, to: Team) => `${name} ${role}, move to ${TEAM[to]}`,
    clueGiverOf: (team: Team) => `${TEAM[team]}’s clue-giver`,
    makeClueGiver: (name: string) => `${name} gives the clues`,
    noAccount: 'Not signed in · can guess, can’t give clues',
    invite: 'Invite',
    inviteName: (name: string) => `Invite ${name}`,
    shuffle: 'Shuffle teams',
    addPlayer: 'Add player',
    players: 'Players',
    addTo: (team: Team) => `Add a player to ${TEAM[team]}`,
    atTable: 'At the table',
    remove: (name: string) => `Remove ${name}`,
    emptyTeam: 'Nobody yet',
    nextWords: 'Next: words',
    why: {
      fewPlayers: 'Each team needs at least 2 players.',
      tooMany: (max: number) => `At most ${max} players.`,
      noClueGiver: (team: Team) =>
        `${TEAM[team]} needs a clue-giver who is signed in. Invite someone, or move a signed-in player.`,
      sameAccount: 'The two clue-givers must be different people.',
      noPacks: 'Pick a pack, or add at least 25 custom words.',
    },
    wordsTitle: 'Words and rules',
    packs: 'Word packs · pick any',
    pack: {
      everyday: 'English',
      hinglish: 'Hinglish',
      desi: 'Desi',
      family: 'Family',
    } as Record<string, string>,
    custom: 'Custom words',
    customHint: 'Separate words with commas or new lines.',
    customCount: (n: number) =>
      n ? `${plural(n, 'word', 'words')} added · mixed in with the packs` : 'None added',
    customSkipped: (n: number) =>
      `${plural(n, 'word', 'words')} skipped: letters only, at most 16 characters.`,
    timer: 'Turn timer',
    timerOff: 'Off',
    timerMin: (n: number) => `${n} min`,
    entry: 'How clues reach the table',
    typed: 'Typed',
    spoken: 'Spoken',
    typedNote: 'Typed clues show on the board and go in the clue log.',
    spokenNote: 'Clues are said aloud; the clue-giver taps only the number.',
    bestOf: 'Match',
    bestOfN: (n: number) => (n === 1 ? 'One game' : `Best of ${n}`),
    start: 'Start game',
    starting: 'Starting…',
    errors: {
      offline: 'You’re offline. Connect, then try again.',
      words: 'Not enough words in those packs. Add another pack or more custom words.',
      players: 'Some players couldn’t be saved. Check your connection and try again.',
      clueGiverAccount: 'A clue-giver isn’t linked to an account. Pick someone else.',
      generic: 'Couldn’t start the game. Try again.',
    },
  },

  invite: {
    title: (name: string) => `Invite ${name}`,
    body: (name: string) =>
      `Once ${name} has an account and signs in, they can give clues. Send them their invite link.`,
    email: 'Their email',
    create: 'Create invite link',
    creating: 'Creating…',
    ready: 'Send them this link; it signs them up and links their account.',
    copy: 'Copy link',
    copied: 'Copied',
    share: 'Share',
    adminOnly: (name: string) =>
      `Only the admin can send invites. Ask them to invite ${name}, or pick a signed-in clue-giver for now.`,
    failed: 'Couldn’t create the invite. Check the email and try again.',
  },

  waiting: {
    title: 'Waiting for clue-givers',
    open: (a: string, b: string) => `${a} and ${b}, open`,
    onPhone: 'on your phone.',
    qr: 'QR code for play.vectanix.com/ishaara',
    yourGames: 'Signed-in clue-givers see this game under “Your games”.',
    giverOf: (team: Team) => `${TEAM[team]} clue-giver`,
    joined: 'Joined',
    notYet: 'Waiting',
    startsWhen: 'The board opens when both clue-givers have joined.',
    leave: 'Back to games',
    cancel: 'Cancel this game',
    cancelAsk: 'Cancel this game? The clue-givers won’t be able to open it.',
    cancelOk: 'Cancel game',
    keep: 'Keep waiting',
    cancelFailed: 'Couldn’t cancel the game. Try again.',
  },

  board: {
    menu: 'Menu',
    turn: (t: Team) => `${TEAM[t]}’s turn`,
    timeLeft: (s: string) => `${s} left on the timer`,
    cluesBy: (name: string) => `${name}’s clue`,
    waitingClue: (name: string) => `Waiting for ${name}’s clue`,
    clueGiven: 'Clue given',
    guessesLeft: 'guesses left',
    noLimit: '∞',
    left: (t: Team, n: number) => `${TEAM[t]} ${n} left`,
    grid: 'Words',
    card: (word: string, id: Identity | null) =>
      id === null
        ? `${word}, face down`
        : id === 'blank'
          ? `${word}, blank`
          : id === 'trap'
            ? `${word}, the trap`
            : `${word}, ${TEAM[id]}’s word`,
    selected: 'selected',
    guessAsk: (word: string) => `Guess ${word}?`,
    guessHint: 'Tap Confirm, or pick another card',
    confirm: 'Confirm',
    cancel: 'Cancel',
    endTurn: (t: Team) => `End ${TEAM[t]}’s turn`,
    endTurnWhy: 'Make at least one guess first.',
    undo: (word: string) => `Undo ${word}`,
    reveal: {
      own: (word: string, t: Team) => `Yes! ${word} is ${TEAM[t]}’s`,
      other: (word: string, t: Team) => `${word} is ${TEAM[t]}’s. Turn over.`,
      blank: (word: string) => `${word} is blank. Turn over.`,
      trap: (word: string) => `Trap! ${word}`,
      trapBody: (picker: Team, word: string) =>
        `${TEAM[picker]} picked ${word}, the one card nobody should pick.`,
      penalty: (word: string, t: Team) => `${word} revealed for ${TEAM[t]}`,
      seeResult: 'See the result',
    },
    announce: {
      turn: (t: Team, giver: string) => `${TEAM[t]}’s turn. Waiting for ${giver}’s clue.`,
      clue: (giver: string, word: string | null, n: ClueNumber) =>
        word ? `${giver}’s clue: ${word}, ${num(n)}` : `${giver} gave a clue: ${num(n)}`,
      undone: (word: string) => `${word} turned back face down`,
    },
    reconnecting: 'Reconnecting…',
    offline: 'You’re offline',
    paused: 'Taps are paused. The board picks up where it left off.',
    busy: 'Sending…',
    penalty: (name: string, t: Team) => `${name} is picking a ${TEAM[t]} word to reveal`,
    penaltyWhy: (t: Team) => `${TEAM[t]}’s clue was ruled out.`,
    skip: 'Skip',
    skipIn: (s: string) => `Skip in ${s}`,
    skipWhy: 'No free word; play goes on.',
    resign: (t: Team) => `${TEAM[t]} resigns`,
    resignAsk: (t: Team) =>
      `Resign for ${TEAM[t]}? ${TEAM[t === 'sun' ? 'moon' : 'sun']} wins this game.`,
    resignOk: 'Resign',
    leave: 'Back to games',
    leaveNote: 'The game keeps going; open it again from Ishaara’s home.',
    rules: 'How to play',
    refused: {
      offline: 'Not connected. Try again when the board is live.',
      busy: 'Still sending the last tap.',
      stale: 'The board changed. Look again, then pick.',
      generic: 'That didn’t go through. Try again.',
    },
    loading: 'Loading the board',
    loadFailed: 'Couldn’t load this game.',
    gone: 'This game is gone',
    goneBody: 'It was cancelled, or you’re no longer part of it.',
    retry: 'Try again',
  },

  win: {
    title: 'Game over',
    wins: (t: Team) => `${TEAM[t]} wins`,
    noWinner: 'No winner',
    how: (by: EndedBy | null, winner: Team | null, found: number, trapWord: string | null) => {
      if (!winner || by === 'abandoned') return 'Nobody played for 2 hours, so the game ended.';
      const loser = TEAM[winner === 'sun' ? 'moon' : 'sun'];
      if (by === 'trap') return `${loser} picked the trap${trapWord ? `: ${trapWord}` : ''}.`;
      if (by === 'resign') return `${loser} resigned.`;
      return `${TEAM[winner]} found all ${found} words.`;
    },
    match: (sun: number, moon: number, game: number) =>
      `Best of 3 · game ${game} · Sun ${sun}, Moon ${moon}`,
    matchWon: (t: Team) => `${TEAM[t]} wins the match`,
    key: 'The full key',
    keyLabel: 'The full key, every card',
    log: 'Clue log',
    noClues: 'No clues were given.',
    found: (n: number) => `${n} found`,
    endedOn: (id: Identity) =>
      id === 'blank' ? 'blank' : id === 'trap' ? 'trap' : `${TEAM[id]}’s word`,
    penalty: 'ruled out',
    spokenClue: 'Spoken',
    rematch: 'Rematch',
    nextGame: 'Next game',
    rematching: 'Dealing…',
    back: 'Back to games',
    rematchFailed: 'Couldn’t start the rematch. Try again.',
    noWords: 'Not enough fresh words in those packs for a rematch.',
  },
} as const;
