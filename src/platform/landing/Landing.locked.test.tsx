import { render, screen } from '@testing-library/react';
import { setSession } from '@/sync/session';
import Landing from './Landing';

// Ishaara as it will be once built: live, but playable only signed in.
vi.mock('../catalog', async (orig) => {
  const m = await orig<typeof import('../catalog')>();
  return {
    ...m,
    GAMES: m.GAMES.map((g) => (g.id === 'ishaara' ? { ...g, status: 'live' as const } : g)),
  };
});

describe('Landing, a game for signed-in players', () => {
  it('signed out, its card leads to sign in', () => {
    render(<Landing />);
    expect(screen.getByRole('link', { name: 'Sign in to play Ishaara' })).toHaveAttribute(
      'href',
      '/kachuful?open=signin',
    );
  });

  it('signed in, it plays', () => {
    setSession({
      user: { id: 'u1', email: 'a@b.c', role: 'member', playerId: null },
      player: null,
    });
    render(<Landing />);
    expect(screen.getByRole('link', { name: 'Play Ishaara' })).toHaveAttribute('href', '/ishaara');
  });
});
