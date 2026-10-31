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
  { screen: 'history', label: t.hub.nav.history, emoji: '🗂️', icon: Icon.history },
];

export const destRoute = (d: Dest): Route => ({ screen: d.screen });
