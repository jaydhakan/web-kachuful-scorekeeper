import type { KtHubPage } from '@/games/kaali-teeri/state/types';

/** Kaali Teeri's shell and home: the title, the landing card, the hub links and the confirmations. */
export const ktShell = {
  name: 'Kaali Teeri',
  tagline: 'Three of Spades scorekeeper',
  menu: 'Menu',
  home: {
    resume: 'Resume game',
    finished: 'Game finished',
    won: (name: string, pts: number) => `${name} won with ${pts}`,
    leads: (name: string, pts: number) => `${name} leads · ${pts}`,
    hands: (n: number) => `${n} ${n === 1 ? 'hand' : 'hands'} played`,
    saved: (ago: string) => `Saved ${ago}`,
    newGame: 'New Game',
    recent: 'Recent games',
    loading: 'Loading games…',
    empty: 'No games yet. Finished games show up here.',
    unavailable: "Past games can't be read in this browser.",
    gameLine: (players: number, hands: number) =>
      `${players} players · ${hands} ${hands === 1 ? 'hand' : 'hands'}`,
    winner: (name: string, pts: number) => `${name} · ${pts}`,
    inProgress: 'In progress',
    nav: 'Kaali Teeri pages',
  },
  hub: {
    history: 'History',
    leaderboard: 'Leaderboard',
    stats: 'Player stats',
    rules: 'How to play',
    soon: (page: string) =>
      `${page} is on its way. Finished games are kept on this device until then.`,
  } satisfies Record<KtHubPage | 'rules' | 'soon', unknown>,
  sheets: {
    board: 'Scoreboard',
    edit: (n: number) => `Edit hand ${n}`,
    card: (i: number | null) => (i === null ? 'Call a card' : `Called card ${i + 1}`),
    playedBy: 'Who played it?',
  },
  theme: {
    title: 'Your theme',
    followAdmin: 'Same as everyone',
  },
} as const;
