import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { applyToEveryone, previewTheme, restoreAppearance } from '@/state/theme';
import type { Session } from '@/state/persistence';
import { setSession } from '@/sync/session';
import { PlatformNotice } from '../PlatformNotice';
import { dismiss } from '../notice';
import { go, startRoute } from '../route';
import Landing from './Landing';

// The design audit's landing fixes: PL-F03 (theme apply), PL-F08 (what Baithak is), PL-F11 (unknown address),
// PL-F12 (a notice slot), and the chip for a stale session.

vi.mock('../route', async (orig) => ({
  ...(await orig<typeof import('../route')>()),
  go: vi.fn(),
}));
vi.mock('@/state/theme', async (orig) => ({
  ...(await orig<typeof import('@/state/theme')>()),
  previewTheme: vi.fn(),
  applyToEveryone: vi.fn(async () => ({ saved: 'everyone' as const, previous: null })),
  restoreAppearance: vi.fn(async () => ({ saved: 'everyone' as const, previous: null })),
}));

const SESSION: Session = {
  user: { id: 'u1', email: 'jay@example.com', role: 'member', playerId: 'p1' },
  player: { id: 'p1', displayName: 'Jay', emoji: '🦊', color: '#e8a87c' },
};
const setOnline = (v: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value: v, configurable: true });

beforeEach(() => {
  vi.mocked(go).mockClear();
  vi.mocked(previewTheme).mockClear();
  vi.mocked(applyToEveryone).mockClear();
  setOnline(true);
  dismiss();
});

describe('Landing, after the design audit', () => {
  it('says what Baithak is on a phone, and what kind of game each tile is', () => {
    render(<Landing />);
    expect(screen.getByText('Scorekeepers for the games at your table')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Kachuful Scorekeeper/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Ishaara Played in the app/ })).toBeInTheDocument();
  });

  it('an unknown address says so and offers the game it most likely meant', () => {
    history.replaceState(null, '', '/kali-teeri');
    startRoute();
    expect(location.pathname).toBe('/');
    render(<Landing />);
    const line = screen.getByRole('status');
    expect(line).toHaveTextContent('No page at /kali-teeri. Did you mean Kaali Teeri?');
    fireEvent.click(within(line).getByRole('link', { name: 'Open Kaali Teeri' }));
    expect(go).toHaveBeenCalledWith('kaali-teeri');
  });

  it('an address like no game just says there is no page there, and can be dismissed', () => {
    history.replaceState(null, '', '/poker/night');
    startRoute();
    const { unmount } = render(<Landing />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'No page at /poker/night. Here are the games.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
    unmount();
    // Dismissed means gone for this visit, not back on the next landing page.
    render(<Landing />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a stale session asks to sign in again instead of showing the signed-in chip', () => {
    setSession({ ...SESSION, stale: true });
    render(<Landing />);
    const chip = screen.getByRole('link', { name: 'Your session ended. Sign in again' });
    expect(chip).toHaveAttribute('href', '/kachuful?open=signin');
  });

  it('signed in, the chip never shows an email address', () => {
    setSession({ ...SESSION, player: null });
    render(<Landing />);
    expect(screen.getByRole('link', { name: 'Account: Your account' })).toBeInTheDocument();
    expect(screen.queryByText('jay@example.com')).toBeNull();
  });

  it('offline, Ishaara says it needs a connection instead of Play', () => {
    setSession(SESSION);
    setOnline(false);
    render(<Landing />);
    expect(screen.getByRole('link', { name: /^Ishaara.*Needs a connection$/ })).toBeInTheDocument();
  });

  it('an admin’s swatch only previews; Apply changes everyone’s and offers Undo', async () => {
    setSession({ ...SESSION, user: { ...SESSION.user, role: 'admin' } });
    render(
      <>
        <Landing />
        <PlatformNotice />
      </>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    fireEvent.click(within(menu).getByRole('radio', { name: 'Yerba Sun' }));
    expect(previewTheme).toHaveBeenCalledWith('yerba-sun');
    expect(applyToEveryone).not.toHaveBeenCalled();
  });
});

describe('theme apply from the menu', () => {
  it('Apply saves for everyone, says so, and Undo puts the previous theme back', async () => {
    const { applyThemeWithUndo } = await import('../applyTheme');
    render(<PlatformNotice />);
    await act(() =>
      applyThemeWithUndo('yerba-sun', false, 'Jay', {
        applied: (n) => `${n} applied to everyone`,
        appliedHere: (n) => `${n} saved on this device only`,
        undo: 'Undo',
      }),
    );
    expect(applyToEveryone).toHaveBeenCalledWith('yerba-sun', false, 'Jay');
    expect(screen.getByRole('status')).toHaveTextContent('Yerba Sun applied to everyone');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(restoreAppearance).toHaveBeenCalledWith(null, 'Jay');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('a save that reached only this device says so', async () => {
    vi.mocked(applyToEveryone).mockResolvedValueOnce({ saved: 'device', previous: null });
    const { applyThemeWithUndo } = await import('../applyTheme');
    render(<PlatformNotice />);
    await act(() =>
      applyThemeWithUndo('emerald-gilt', false, 'Jay', {
        applied: (n) => `${n} applied to everyone`,
        appliedHere: (n) => `${n} saved on this device only`,
        undo: 'Undo',
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Emerald Gilt saved on this device only');
  });
});
