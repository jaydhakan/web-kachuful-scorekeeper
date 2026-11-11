import { render, screen } from '@testing-library/react';
import { setSession } from '@/sync/session';
import Landing from './Landing';

describe('Landing, a game for signed-in players', () => {
  it('signed out, its card leads to sign in', () => {
    render(<Landing />);
    expect(screen.getByRole('link', { name: /^Ishaara.*Sign in to play$/ })).toHaveAttribute(
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
    expect(screen.getByRole('link', { name: /^Ishaara.*Play$/ })).toHaveAttribute(
      'href',
      '/ishaara',
    );
  });
});
