import type { Trump } from '@/domain';
import { palette } from './palette';

const glowOf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, .25)`;
};

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
