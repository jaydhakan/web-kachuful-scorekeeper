import type { ReactElement } from 'react';
import type { Route, RouteName } from '@/state/types';
import { Icon } from './ui/Icons';
import { t } from '@/strings';

export interface Dest {
  screen: RouteName;
  label: string;
  emoji: string;
  icon: ReactElement;
  /** Only shown signed in. */
  online?: boolean;
}

/** The places Home, the menu and the large-screen rail lead to, in one order. */
export const DESTS: Dest[] = [
  { screen: 'leaderboard', label: t.hub.nav.boards, emoji: '🏆', icon: Icon.boards },
  { screen: 'history', label: t.hub.nav.history, emoji: '🗂️', icon: Icon.history },
  { screen: 'players', label: t.hub.nav.players, emoji: '👥', icon: Icon.players },
  { screen: 'awards', label: t.hub.nav.awards, emoji: '🎖️', icon: Icon.awards },
  { screen: 'activity', label: t.hub.nav.activity, emoji: '📰', icon: Icon.activity, online: true },
];

/** The destinations for the signed-in state. */
export const destsFor = (signedIn: boolean) => DESTS.filter((d) => signedIn || !d.online);

export const destRoute = (d: Pick<Dest, 'screen'>): Route => ({ screen: d.screen });
