import { fireEvent, render, screen } from '@testing-library/react';
import { setSession } from '@/sync/session';
import Ishaara from './index';

const sw = vi.hoisted(() => ({ needRefresh: false, reload: vi.fn() }));
vi.mock('@/hooks/useServiceWorker', () => ({
  useServiceWorker: () => ({ ...sw, offlineReady: false, announced: vi.fn() }),
}));

const signIn = () =>
  setSession({ user: { id: 'u1', email: 'a@b.c', role: 'member', playerId: null }, player: null });
const setOnline = (v: boolean) =>
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v });

afterEach(() => {
  setOnline(true);
  sw.needRefresh = false;
});

describe('Ishaara’s gates', () => {
  it('signed out, it asks to sign in through the account pages', () => {
    render(<Ishaara />);
    expect(screen.getByRole('heading', { name: 'Sign in to play' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/kachuful?open=signin',
    );
    // The primary button's materials, so each theme paints its own label colour on it (PL-F02).
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveClass(
      'mat-cta',
      'mat-cta-on',
      'mat-tone-accent',
    );
  });

  it('leaves the update gate to PlatformRoot, so a waiting update never draws two (PL-F04)', () => {
    sw.needRefresh = true;
    signIn();
    render(<Ishaara />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
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
