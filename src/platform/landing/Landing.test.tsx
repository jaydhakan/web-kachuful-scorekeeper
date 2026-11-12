import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { demoGame } from '@/games/kachuful/domain';
import { KEYS, storage, type Session } from '@/state/persistence';
import { setSession } from '@/sync/session';
import { gameById } from '../catalog';
import { go, startRoute } from '../route';
import Landing from './Landing';
import { CAP_MS, FADE_MS, GROW_MS, OpenGameCover } from './OpenGame';

vi.mock('../route', async (orig) => ({
  ...(await orig<typeof import('../route')>()),
  go: vi.fn(),
}));

const SESSION: Session = {
  user: { id: 'u1', email: 'jay@example.com', role: 'member', playerId: 'p1' },
  player: { id: 'p1', displayName: 'Jay', emoji: '🦊', color: '#e8a87c' },
};

const setOnline = (v: boolean) =>
  Object.defineProperty(navigator, 'onLine', { value: v, configurable: true });

beforeEach(() => {
  vi.mocked(go).mockClear();
  setOnline(true);
});

describe('Landing', () => {
  it('first visit: every game, nothing to resume, Sign in', () => {
    render(<Landing />);
    expect(screen.getByRole('heading', { level: 1, name: 'Pick a game' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pick up where you left off' })).toBeNull();
    expect(screen.getByRole('link', { name: /^Kachuful.*Play$/ })).toHaveAttribute(
      'href',
      '/kachuful',
    );
    expect(screen.getByRole('link', { name: /^Kaali Teeri.*Play$/ })).toHaveAttribute(
      'href',
      '/kaali-teeri',
    );
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/kachuful?open=signin',
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a saved game gets a Resume row with its line and age', () => {
    storage.set(KEYS.game, { ...demoGame(), id: 'g1', updatedAt: Date.now() - 3 * 60e3 });
    render(<Landing />);
    const panel = screen.getByRole('heading', { name: 'Pick up where you left off' })
      .parentElement as HTMLElement;
    expect(within(panel).getByText(/^Round \d+ · .* · saved 3 min ago$/)).toBeInTheDocument();
    const resume = within(panel).getByRole('link', { name: 'Resume Kachuful' });
    fireEvent.click(resume);
    expect(go).toHaveBeenCalledWith('kachuful');
  });

  it('the demo a first visit seeds is not offered as a resume', () => {
    storage.set(KEYS.game, demoGame());
    render(<Landing />);
    expect(screen.queryByRole('link', { name: /^Resume/ })).toBeNull();
  });

  it('a plain click opens the game in place; a modified click is left to the browser', () => {
    render(<Landing />);
    const link = screen.getByRole('link', { name: /^Kachuful.*Play$/ });
    expect(fireEvent.click(link, { metaKey: true })).toBe(true);
    expect(go).not.toHaveBeenCalled();
    expect(fireEvent.click(link)).toBe(false);
    expect(go).toHaveBeenCalledWith('kachuful');
  });

  it('with motion, a tile grows first and the game opens when it has; Resume opens at once', () => {
    vi.useFakeTimers();
    history.replaceState(null, '', '/');
    startRoute();
    window.matchMedia = () => ({ matches: false }) as MediaQueryList;
    const load = vi.spyOn(gameById('kachuful'), 'load').mockResolvedValue({ default: () => null });
    storage.set(KEYS.game, { ...demoGame(), id: 'g1', updatedAt: Date.now() });
    render(
      <>
        <Landing />
        <OpenGameCover />
      </>,
    );
    const link = screen.getByRole('link', { name: /^Kachuful.*Play$/ });
    const art = link.querySelector('[data-tile-art]') as HTMLElement;
    art.getBoundingClientRect = () => new DOMRect(20, 300, 88, 88);
    expect(fireEvent.click(link)).toBe(false);
    expect(go).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);
    const cover = document.querySelector('[data-open-game]') as HTMLElement;
    expect(cover).toHaveAttribute('aria-hidden', 'true');
    expect(cover).toHaveClass('pointer-events-none');
    // A second tap while it grows opens nothing twice.
    fireEvent.click(link);
    act(() => void vi.advanceTimersByTime(GROW_MS));
    expect(go).toHaveBeenCalledTimes(1);
    expect(go).toHaveBeenCalledWith('kachuful');
    // The game never reports in here, so the cap takes the cover away.
    expect(document.querySelector('[data-open-game]')).toHaveAttribute('data-open-game', 'cover');
    act(() => void vi.advanceTimersByTime(CAP_MS - GROW_MS + FADE_MS));
    expect(document.querySelector('[data-open-game]')).toBeNull();

    vi.mocked(go).mockClear();
    fireEvent.click(screen.getByRole('link', { name: 'Resume Kachuful' }));
    expect(go).toHaveBeenCalledWith('kachuful');
    expect(document.querySelector('[data-open-game]')).toBeNull();
    vi.useRealTimers();
  });

  it('signed in: the account chip names the person and opens their account', () => {
    setSession(SESSION);
    render(<Landing />);
    const chip = screen.getByRole('link', { name: 'Account: Jay' });
    expect(chip).toHaveAttribute('href', '/kachuful?open=account');
    fireEvent.click(chip);
    expect(go).toHaveBeenCalledWith('kachuful', '?open=account');
  });

  it('offline says games still save here', () => {
    setOnline(false);
    render(<Landing />);
    expect(screen.getByRole('status')).toHaveTextContent(/Offline/);
  });

  it('the menu opens with sign in and credits; members see no theme', () => {
    setSession(SESSION);
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const menu = screen.getByRole('dialog', { name: 'Menu' });
    expect(within(menu).getByRole('link', { name: /Credits/ })).toHaveAttribute(
      'href',
      '/kachuful?open=credits',
    );
    expect(within(menu).queryByRole('radiogroup')).toBeNull();
  });

  it('admins get the theme picker in the menu', () => {
    setSession({ ...SESSION, user: { ...SESSION.user, role: 'admin' } });
    render(<Landing />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const themes = within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('radiogroup');
    expect(within(themes).getAllByRole('radio')).toHaveLength(4);
  });
});
