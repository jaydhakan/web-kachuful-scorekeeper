import { fireEvent, render, screen, within } from '@testing-library/react';
import { demoGame } from '@/games/kachuful/domain';
import { KEYS, storage, type Session } from '@/state/persistence';
import { setSession } from '@/sync/session';
import { go } from '../route';
import Landing from './Landing';

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
