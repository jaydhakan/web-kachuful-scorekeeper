import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { kitGame } from '@/games/spades/domain/__fixtures__/kit';
import { KEYS, storage } from '@/state/persistence';
import { resetSeatInvitesForTests, setInvites, type SeatInvite } from '@/sync/seatInvites';
import { resetSignalsForTests } from '@/sync/seatInviteSignals';
import { setSession } from '@/sync/session';
import Spades from '../index';
import Home from './Home';

const ep = vi.hoisted(() => ({
  mine: vi.fn(),
  circle: vi.fn(),
  create: vi.fn(),
  accept: vi.fn(),
  decline: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock('@/sync/seatInviteApi', () => ({ seatEp: ep, ONLINE_MS: 60_000 }));

const signIn = () =>
  setSession({ user: { id: 'u1', email: 'a@b.c', role: 'member', playerId: null }, player: null });
const setOnline = (v: boolean) =>
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => v });
const u = () => userEvent.setup({ pointerEventsCheck: 0 });

const NOW = Date.now();
const invite: SeatInvite = {
  id: 'i1',
  kind: 'spades-online',
  gameId: 'g1',
  seat: '0',
  status: 'pending',
  createdAt: NOW,
  from: { userId: 'u-kabir', name: 'Kabir', emoji: '🐯', color: '#ff8800', photoUrl: null },
  table: { name: 'Sunday spades', seatsTaken: [1, 2, 3] },
  partner: { name: 'Zoya' },
};

beforeEach(() => {
  history.replaceState(null, '', '/spades');
  resetSeatInvitesForTests();
  resetSignalsForTests();
  Object.values(ep).forEach((f) => f.mockReset());
});
afterEach(() => setOnline(true));

describe('Spades home, signed out', () => {
  it('asks for sign-in to play online, and keeps the scorekeeper open', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1, name: 'Spades' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Sign in to play online' });
    expect(link).toHaveAttribute('href', '/kachuful?open=signin&from=spades');
    expect(screen.queryByRole('button', { name: 'Start a table' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open the scorekeeper' })).toBeInTheDocument();
  });

  it('a join link opened signed out carries its code through sign-in', () => {
    render(<Home joinCode="KQ7M" />);
    expect(screen.getByRole('link', { name: 'Sign in to join table KQ7M' })).toHaveAttribute(
      'href',
      '/kachuful?open=signin&from=spades&back=%3Fjoin%3DKQ7M',
    );
  });
});

describe('Spades home, signed in', () => {
  it('starts a table', async () => {
    signIn();
    render(<Home />);
    await u().click(screen.getByRole('button', { name: 'Start a table' }));
    expect(location.search).toBe('?table=new');
  });

  it('offline, says online play needs a connection; the scorekeeper still opens', async () => {
    signIn();
    setOnline(false);
    render(<Home />);
    expect(screen.getByRole('status')).toHaveTextContent('Online play needs a connection');
    expect(screen.queryByRole('button', { name: 'Start a table' })).not.toBeInTheDocument();
    await u().click(screen.getByRole('button', { name: 'Open the scorekeeper' }));
    expect(location.search).toBe('?keep');
  });

  it('joins with a code: upper-cased, lookalikes refused, then the table', async () => {
    signIn();
    const user = u();
    render(<Home />);
    await user.click(screen.getByRole('button', { name: 'Join with code' }));
    const sheet = screen.getByRole('dialog', { name: 'Join a table' });
    const field = within(sheet).getByLabelText('Table code');
    expect(field).toHaveFocus();
    const go = within(sheet).getByRole('button', { name: 'Join table' });
    await user.type(field, 'kq0');
    expect(field).toHaveValue('KQ');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(within(sheet).getByText('0 is never in a table code.')).toBeInTheDocument();
    expect(go).toBeDisabled();
    await user.type(field, '7m');
    expect(field).toHaveValue('KQ7M');
    expect(field).not.toHaveAttribute('aria-invalid');
    expect(go).toBeEnabled();
    await user.keyboard('{Enter}');
    // The sheet's history entry goes first, then the address moves on.
    await waitFor(() => expect(location.search).toBe('?join=KQ7M'));
  });

  it('a pasted share link fills the code', async () => {
    signIn();
    render(<Home />);
    await u().click(screen.getByRole('button', { name: 'Join with code' }));
    const field = screen.getByLabelText('Table code');
    fireEvent.paste(field, {
      clipboardData: { getData: () => 'https://play.vectanix.com/spades?join=zx9p' },
    });
    expect(field).toHaveValue('ZX9P');
  });
});

describe('Spades home, everyone', () => {
  it('resumes the table-mode game with its score', async () => {
    storage.set(
      KEYS.spGame,
      kitGame([
        { bids: [3, 3, 3, 3], teamA: 7 },
        { bids: [null, null, null, null], phase: 'bidding' },
      ]),
    );
    render(<Home />);
    const row = screen.getByRole('button', { name: 'Resume the game at the table, hand 2' });
    expect(row).toHaveTextContent('Riya & Dev 61 · Arjun & Meera 60');
    await u().click(row);
    expect(location.search).toBe('?keep');
  });

  it('has no resume row with nothing in progress', () => {
    render(<Home />);
    expect(screen.queryByRole('button', { name: /^Resume/ })).not.toBeInTheDocument();
  });

  it('opens History and Leaderboard in table mode, and the rules in a sheet', async () => {
    const user = u();
    render(<Home />);
    const nav = screen.getByRole('navigation', { name: 'History, leaderboard and rules' });
    await user.click(within(nav).getByRole('button', { name: 'History' }));
    expect(location.search).toBe('?keep&page=history');
    await user.click(within(nav).getByRole('button', { name: 'Leaderboard' }));
    expect(location.search).toBe('?keep&page=leaderboard');
    await user.click(within(nav).getByRole('button', { name: 'Rules' }));
    const sheet = screen.getByRole('dialog', { name: 'How to play Spades' });
    expect(
      await within(sheet).findByRole('heading', { name: 'What “spades broken” means' }),
    ).toBeInTheDocument();
    expect(sheet).toHaveTextContent(
      'Nil failed −100. Q set, −40. P’s 2 tricks are still bags, +2.',
    );
    expect(sheet).toHaveTextContent('The total is 92.');
  });
});

describe('Spades root', () => {
  it('shows an invite card whose Join accepts, then opens that table here', async () => {
    signIn();
    ep.accept.mockResolvedValue({});
    setInvites([invite], NOW);
    render(<Spades />);
    const card = screen.getByRole('article', { name: 'Kabir invited you' });
    expect(card).toHaveTextContent('Sunday spades · you’d partner Zoya');
    await u().click(within(card).getByRole('button', { name: 'Join' }));
    await waitFor(() => expect(location.search).toBe('?table=g1'));
    expect(ep.accept).toHaveBeenCalledWith('i1');
    // No server here: the online table opens, and says it couldn't load.
    expect(await screen.findByRole('heading', { name: 'The table didn’t load' })).toBeVisible();
  });

  it('sends a signed-out join link to Home, asking for sign-in with the code', () => {
    history.replaceState(null, '', '/spades?join=KQ7M');
    render(<Spades />);
    expect(screen.getByRole('link', { name: 'Sign in to join table KQ7M' })).toBeInTheDocument();
  });

  it('opens table mode on ?keep and online play on ?join once signed in; Back returns Home', async () => {
    signIn();
    history.replaceState(null, '', '/spades?keep');
    render(<Spades />);
    // Setup's title is drawn twice (the large title and its two-pane twin).
    expect((await screen.findAllByRole('heading', { name: 'Who’s playing?' }))[0]).toBeVisible();
    act(() => {
      history.pushState(null, '', '/spades?join=KQ7M');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(await screen.findByRole('heading', { name: 'Couldn’t join table KQ7M' })).toBeVisible();
    await u().click(screen.getByRole('button', { name: 'Back to Spades' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Spades' })).toBeInTheDocument();
  });

  it('a live link opens online play signed out', async () => {
    history.replaceState(null, '', '/spades?live=tok');
    render(<Spades />);
    expect(
      await screen.findByRole('heading', { name: 'The live table didn’t load.' }),
    ).toBeVisible();
  });
});
