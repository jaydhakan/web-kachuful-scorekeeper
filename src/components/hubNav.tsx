import type { ReactElement } from 'react';
import type { Route, RouteName } from '@/state/types';
import { Icon } from './ui/Icons';
import { t } from '@/strings';

export interface Dest {
  screen: RouteName;
  label: string;
  /** A label for narrow tiles, when the full one can't wrap. */
  tile?: string;
  icon: ReactElement;
  /** Only shown signed in. */
  online?: boolean;
}

/** The places Home, the menu and the large-screen rail lead to, in one order. */
export const DESTS: Dest[] = [
  {
    screen: 'leaderboard',
    label: t.hub.nav.leaderboard,
    tile: t.hub.nav.leaderboardTile,
    icon: Icon.boards,
  },
  { screen: 'history', label: t.hub.nav.history, icon: Icon.history },
  { screen: 'players', label: t.hub.nav.players, icon: Icon.players },
  { screen: 'awards', label: t.hub.nav.awards, icon: Icon.awards },
  { screen: 'activity', label: t.hub.nav.activity, icon: Icon.activity, online: true },
];

/** The destinations for the signed-in state. */
export const destsFor = (signedIn: boolean) => DESTS.filter((d) => signedIn || !d.online);

export const destRoute = (d: Pick<Dest, 'screen'>): Route => ({ screen: d.screen });
