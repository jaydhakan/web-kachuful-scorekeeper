import type { ComponentType } from 'react';
import { peek as kfPeek } from '@/games/kachuful/state/peek';
import { peek as ktPeek } from '@/games/kaali-teeri/state/peek';
import { platform } from '@/strings/platform';
import type { GameId } from './route';

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
  status: 'live' | 'soon';
  /** Shown to everyone, playable only signed in (Ishaara: the server runs the game). */
  signedInOnly: boolean;
  /** The game's lazy root. */
  load: () => Promise<{ default: ComponentType }>;
  peek: () => Resume | null;
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
  },
  {
    id: 'kaali-teeri',
    path: '/kaali-teeri',
    ...g['kaali-teeri'],
    status: 'live',
    signedInOnly: false,
    load: () => import('@/games/kaali-teeri'),
    peek: ktPeek,
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
