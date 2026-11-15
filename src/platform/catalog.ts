import type { ComponentType } from 'react';
import { peek as kfPeek } from '@/games/kachuful/state/peek';
import { peek as ktPeek } from '@/games/kaali-teeri/state/peek';
import { platform } from '@/strings/platform';
import type { GameId } from './route';

/** A game's sync, for pages that speak for every game (Me, signing out); loaded only when asked for. */
export interface GameSync {
  syncNow: () => Promise<void>;
  /** Games scored here for this account that the server hasn't accepted yet. */
  pending: (userId: string) => number;
}

/** A saved game's resume line for the landing card, read without loading the game. */
export interface Resume {
  line: string;
  updatedAt: number;
}

export interface GameEntry {
  id: GameId;
  path: `/${string}`;
  name: string;
  pitch: string;
  players: string;
  /** What kind of thing it is, on the tile: a scorekeeper for a real table, or a game played in the app. */
  kind: string;
  status: 'live' | 'soon';
  /** Shown to everyone, playable only signed in (Ishaara: the server runs the game). */
  signedInOnly: boolean;
  /** The game's lazy root. */
  load: () => Promise<{ default: ComponentType }>;
  peek: () => Resume | null;
  /** Absent for a game the server runs (Ishaara): nothing is ever waiting to upload. */
  sync?: () => Promise<GameSync>;
}

const g = platform.games;

/** Every game on the site, in landing-page order; the router, landing page, manifest and HTML pages read this. */
export const GAMES: readonly GameEntry[] = [
  {
    id: 'kachuful',
    path: '/kachuful',
    ...g.kachuful,
    status: 'live',
    signedInOnly: false,
    load: () => import('@/games/kachuful'),
    peek: kfPeek,
    sync: () =>
      import('@/games/kachuful/sync/engine').then((m) => ({
        syncNow: () => m.syncNow(),
        pending: (u) => m.pendingGames(u).length,
      })),
  },
  {
    id: 'kaali-teeri',
    path: '/kaali-teeri',
    ...g['kaali-teeri'],
    status: 'live',
    signedInOnly: false,
    load: () => import('@/games/kaali-teeri'),
    peek: ktPeek,
    sync: () =>
      import('@/games/kaali-teeri/sync/engine').then((m) => ({
        syncNow: () => m.syncKtNow(),
        pending: (u) => m.pendingKtGames(u).length,
      })),
  },
  {
    id: 'ishaara',
    path: '/ishaara',
    ...g.ishaara,
    status: 'live',
    signedInOnly: true,
    load: () => import('@/games/ishaara'),
    // Nothing to resume from storage: the server holds every game.
    peek: () => null,
  },
];

export const gameById = (id: GameId) => GAMES.find((x) => x.id === id) as GameEntry;

/** Every game's sync at once: Me's "Sync now" and the sign-out count speak for all of them, not one. */
export async function allSync(): Promise<GameSync> {
  const each = await Promise.all(GAMES.flatMap((g) => (g.sync ? [g.sync()] : [])));
  return {
    syncNow: () => Promise.all(each.map((s) => s.syncNow())).then(() => {}),
    pending: (u) => each.reduce((n, s) => n + s.pending(u), 0),
  };
}
