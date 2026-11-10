import { fireEvent, render, screen } from '@testing-library/react';
import { setSession } from '@/sync/session';
import Ishaara from './index';

const signIn = () =>
  setSession({ user: { id: 'u1', email: 'a@b.c', role: 'member', playerId: null }, player: null });
const setOnline = (v: boolean) =>
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v });

afterEach(() => setOnline(true));

describe('Ishaara’s gates', () => {
  it('signed out, it asks to sign in through the account pages', () => {
    render(<Ishaara />);
    expect(screen.getByRole('heading', { name: 'Sign in to play' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/kachuful?open=signin',
    );
  });

  it('offline, it says it needs a connection and still opens History', async () => {
    signIn();
    setOnline(false);
    render(<Ishaara />);
    expect(screen.getByRole('heading', { name: 'Ishaara needs a connection' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    // History is its own lazy chunk.
    expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument();
  });

  it('signed in and online, it opens the game', () => {
    signIn();
    render(<Ishaara />);
    expect(screen.getByRole('heading', { name: 'Ishaara' })).toBeInTheDocument();
  });
});
