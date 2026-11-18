import { describe, expect, it } from 'vitest';
import type { Activity } from '@/sync/types';
import { finishedLine } from './feedLine';

const item = (gameKind: Activity['gameKind'], game: unknown): Activity => ({
  id: 1,
  kind: 'game_finished',
  gameKind,
  player: null,
  game: game as Activity['game'],
  data: {},
  createdAt: 0,
});

describe('a finished game in the feed', () => {
  it('names the winner and their points in Kachuful and Kaali Teeri', () => {
    const players = [
      { name: 'Riya', place: 2, points: 40 },
      { name: 'Dev', place: 1, points: 120 },
    ];
    expect(finishedLine(item('kachuful', { players }))).toBe('Dev won a game · +120');
    expect(finishedLine(item('kaali-teeri', { kind: 'kaali-teeri', players }))).toBe(
      'Dev won a game · +120',
    );
  });

  it('names the winning partners and the score in a Spades table-mode game', () => {
    const g = {
      kind: 'spades',
      players: [
        { name: 'Riya', team: 'a' },
        { name: 'Arjun', team: 'b' },
        { name: 'Dev', team: 'a' },
        { name: 'Meera', team: 'b' },
      ],
      scores: { a: 180, b: 242 },
      result: { winner: 'b' },
    };
    expect(finishedLine(item('spades', g))).toBe('Arjun & Meera won a game · 242–180');
  });

  it('reads an online table by seat, and a draw as a draw', () => {
    const seats = [{ name: 'Riya' }, { name: 'Arjun' }, { name: 'Dev' }, null];
    const g = { kind: 'spades-online', seats, scores: { a: 250, b: 90 }, result: { winner: 'a' } };
    expect(finishedLine(item('spades', g))).toBe('Riya & Dev won a game · 250–90');
    expect(finishedLine(item('spades', { ...g, result: { winner: 'draw' } }))).toBe(
      'A game ended in a draw',
    );
  });

  it('names the winning team in Ishaara, and says only that it ended without one', () => {
    expect(finishedLine(item('ishaara', { winner: 'moon' }))).toBe('Team Moon won a game');
    expect(finishedLine(item('ishaara', { winner: null }))).toBe('A game ended');
  });
});
