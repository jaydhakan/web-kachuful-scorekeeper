import type { Trump } from '@/domain';
import { palette } from './palette';

// A theme with no glow sets --trump-glow-amt to 0%, which makes this transparent.
const glowOf = (c: string) => `color-mix(in srgb, ${c} var(--trump-glow-amt), transparent)`;

export interface TrumpTheme {
  sym: string;
  name: string;
  acc: string;
  glow: string;
  col: string;
}

export const TR: Record<Trump, TrumpTheme> = {
  spades: {
    sym: '♠',
    name: 'Spades',
    acc: palette['accent-spades'],
    glow: glowOf(palette['accent-spades']),
    col: palette['suit-black'],
  },
  diamonds: {
    sym: '♦',
    name: 'Diamonds',
    acc: palette['accent-diamonds'],
    glow: glowOf(palette['accent-diamonds']),
    col: palette['suit-red'],
  },
  clubs: {
    sym: '♣',
    name: 'Clubs',
    acc: palette['accent-clubs'],
    glow: glowOf(palette['accent-clubs']),
    col: palette['suit-black'],
  },
  hearts: {
    sym: '♥',
    name: 'Hearts',
    acc: palette['accent-hearts'],
    glow: glowOf(palette['accent-hearts']),
    col: palette['suit-red'],
  },
};
