import type { ReactElement } from 'react';
import type { Route, RouteName } from '@/state/types';
import { Icon } from './ui/Icons';
import { t } from '@/strings';

export interface Dest {
  screen: RouteName;
  label: string;
  emoji: string;
  icon: ReactElement;
}

/** The places Home, the menu and the large-screen rail lead to, in one order. */
export const DESTS: Dest[] = [
  { screen: 'leaderboard', label: t.hub.nav.boards, emoji: '🏆', icon: Icon.boards },
  { screen: 'history', label: t.hub.nav.history, emoji: '🗂️', icon: Icon.history },
  { screen: 'players', label: t.hub.nav.players, emoji: '👥', icon: Icon.players },
  { screen: 'awards', label: t.hub.nav.awards, emoji: '🎖️', icon: Icon.awards },
];

export const destRoute = (d: Pick<Dest, 'screen'>): Route => ({ screen: d.screen });
