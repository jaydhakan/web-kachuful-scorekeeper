import type { SikkeKind } from '@/sync/types';

const n = (v: number) => v.toLocaleString('en-IN');

/** Sikke, the app's coins (REWARDS-PLAN §9): the wallet, the ledger and the winner screen's "+🪙". */
export const sikke = {
  glyph: '🪙',
  name: 'Sikke',
  amount: (v: number) => `${n(v)} 🪙`,
  plus: (v: number) => `+${n(v)} 🪙`,
  /** Level names by `n`, from Naya to Baithak Ka Sitara. */
  level: ['', 'Naya', 'Mehmaan', 'Regular', 'Pakka', 'Ghar Ka', 'Baithak Ka Sitara'],
  levelOf: (k: number) => `Level ${k} · ${sikke.level[k] ?? ''}`,
  toNext: (left: number, k: number) => `${n(left)} to ${sikke.level[k] ?? ''}`,
  top: 'Top level',
  /** The wallet chip as a screen reader hears it. */
  walletSaid: (balance: number, k: number) =>
    `${n(balance)} Sikke, ${sikke.level[k] ?? ''}. Open the ledger`,
  ledger: 'Sikke ledger',
  lifetime: (v: number) => `${n(v)} earned in all`,
  empty: 'No Sikke yet. Finish a game signed in and they start coming.',
  more: 'Show more',
  kind: {
    finish: 'Finished a game',
    win: 'Won a game',
    achievement: 'Achievement',
    kursi_take: 'Took the Kursi',
    kursi_defence: 'Defended the Kursi',
    streak: "This week's first game",
  } satisfies Record<SikkeKind, string>,
  /** The winner screen's strip. */
  earned: 'Sikke earned',
  counting: 'Counting Sikke…',
  retry: 'Try again',
  levelUp: (k: number) => `Level up: ${sikke.level[k] ?? ''}!`,
  rowSaid: (name: string, v: number, up: number | null) =>
    `${name}: ${n(v)} Sikke${up ? `, up to ${sikke.level[up] ?? ''}` : ''}`,
};
