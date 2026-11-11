import { useEffect } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { IshaaraPublic } from '@/games/ishaara/domain';
import { plainKey, started } from '@/games/ishaara/domain/__fixtures__/kit';
import type { SendResult } from '@/games/ishaara/state/link';
import { useYourGames } from '@/games/ishaara/state/lists';
import { IshaaraProvider, useIshaara, type IshaaraNav } from '@/games/ishaara/state/store';
import { useClue, type IshaaraClue } from '@/games/ishaara/state/useTable';
import type { IshaaraSummaryOut } from '@/games/ishaara/sync/types';
import { memoryBackend, resetArchive } from '@/state/archive';
import { ApiError } from '@/sync/api';
import type { Remote } from '@/sync/useRemote';
import ClueHome from './ClueHome';

vi.mock('@/games/ishaara/state/useTable', () => ({ useClue: vi.fn() }));
vi.mock('@/games/ishaara/state/lists', () => ({ useYourGames: vi.fn() }));

const G = started().state;
const KEY = plainKey('sun'); // 0–8 Sun, 9–16 Moon, 17–23 blank, 24 the trap; this phone is Sun's (Riya)
const okSend = () =>
  vi.fn<(a: unknown) => Promise<SendResult>>().mockResolvedValue({ ok: true, game: G });

let state: IshaaraClue;
function phone(game: Partial<IshaaraPublic> = {}, over: Partial<IshaaraClue> = {}) {
  state = {
    game: { ...G, ...game },
    me: { host: false, team: 'sun' },
    status: 'ready',
    conn: 'live',
    busy: false,
    lastError: null,
    clockOffset: 0,
    send: okSend(),
    reload: vi.fn(),
    key: KEY,
    team: 'sun',
    keyStatus: 'ready',
    openKey: vi.fn(),
    ...over,
  };
  vi.mocked(useClue).mockImplementation(() => state);
  return state;
}

const seen: { nav: IshaaraNav | null } = { nav: null };
function NavSpy() {
  const { nav } = useIshaara();
  useEffect(() => void (seen.nav = nav));
  return null;
}
const AT_KEY: IshaaraNav = { screen: 'key', gameId: G.id, role: 'clue' };
const mount = (initial: IshaaraNav = AT_KEY) =>
  render(
    <IshaaraProvider initial={initial}>
      <NavSpy />
      <ClueHome />
    </IshaaraProvider>,
  );
/** Renders the key screen straight past the gate. */
const atKey = () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: /Show key/ }));
};
const send = () => vi.mocked(state.send);

describe('key gate', () => {
  it('shows nothing of the key until Show key, asks for it then, and Hide goes back', () => {
    phone({}, { key: null, team: null, keyStatus: 'idle' });
    state.openKey = vi.fn(() => {
      state = { ...state, key: KEY, team: 'sun', keyStatus: 'ready' };
    });
    mount();
    expect(screen.getByRole('heading', { name: 'Make sure nobody else can see' })).toBeVisible();
    expect(screen.getByText('Sun clue-giver · Riya')).toBeVisible();
    expect(screen.queryByRole('list', { name: 'Your key' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Show key/ }));
    expect(state.openKey).toHaveBeenCalled();
    const grid = screen.getByRole('list', { name: 'Your key' });
    expect(within(grid).getAllByRole('listitem')).toHaveLength(25);
    expect(within(grid).getByRole('img', { name: 'RIVER, Sun’s word' })).toBeVisible();
    expect(within(grid).getByRole('img', { name: 'CHAI, the trap' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Hide key' })).toHaveFocus();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Sun’s turn: your clue · Sun 9 left · Moon 8 left',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Hide key' }));
    expect(screen.queryByRole('list', { name: 'Your key' })).toBeNull();
    expect(screen.getByRole('button', { name: /Show key/ })).toHaveFocus();
  });

  it('Not yet goes back to Your games', () => {
    phone();
    vi.mocked(useYourGames).mockReturnValue(remote([]));
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Not yet' }));
    expect(seen.nav?.screen).toBe('clue-list');
    expect(screen.getByRole('heading', { name: 'Your games' })).toBeVisible();
  });

  it('says plainly when the key is refused, or failed to load', () => {
    phone({}, { key: null, team: null, keyStatus: 'forbidden' });
    const { unmount } = mount();
    fireEvent.click(screen.getByRole('button', { name: /Show key/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('This key isn’t yours');
    unmount();
    phone({}, { key: null, team: null, keyStatus: 'error' });
    mount();
    fireEvent.click(screen.getByRole('button', { name: /Show key/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.openKey).toHaveBeenCalledTimes(2);
  });

  it('shows loading and a Retry while the game itself is missing', () => {
    phone({}, { game: null, status: 'loading' });
    const { unmount } = mount();
    expect(screen.getByRole('status')).toHaveTextContent('Opening the game');
    unmount();
    phone({}, { game: null, status: 'error' });
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.reload).toHaveBeenCalled();
  });
});

describe('typed clue', () => {
  const field = () => screen.getByRole('textbox', { name: /Your clue/ });
  const sendBtn = () => screen.getByRole('button', { name: /^Send/ });

  it('is blocked live while it matches a face-down word, and says why', () => {
    phone();
    atKey();
    fireEvent.click(screen.getByRole('button', { name: '2', pressed: false }));
    fireEvent.change(field(), { target: { value: 'riverbank' } });
    expect(screen.getByText('RIVERBANK contains RIVER, still face down')).toBeVisible();
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(sendBtn()).toBeDisabled();
    fireEvent.change(field(), { target: { value: 'Rivers' } });
    expect(screen.getByText('RIVERS is a form of RIVER, still face down')).toBeVisible();
    fireEvent.change(field(), { target: { value: 'kite' } });
    expect(screen.getByText('KITE is on the board, still face down')).toBeVisible();
    fireEvent.change(field(), { target: { value: 'two words' } });
    expect(screen.getByText(/One word only/)).toBeVisible();
    expect(sendBtn()).toBeDisabled();
  });

  it('is allowed once the word is revealed, and sends word and number', async () => {
    const revealed = G.revealed.slice();
    revealed[0] = 'sun';
    phone({ revealed });
    atKey();
    fireEvent.change(field(), { target: { value: 'riverbank' } });
    expect(screen.getByText(/Not on the board/)).toBeVisible();
    expect(sendBtn()).toBeDisabled(); // no number yet
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(sendBtn()).toHaveAccessibleName('Send RIVERBANK · 2');
    await act(async () => void fireEvent.click(sendBtn()));
    expect(send()).toHaveBeenCalledWith({ type: 'clue', word: 'riverbank', number: 2 });
  });

  it('picks one number at a time from 0–9 and ∞', async () => {
    phone();
    atKey();
    fireEvent.change(field(), { target: { value: 'spice' } });
    for (const n of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
      expect(screen.getByRole('button', { name: n })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Any number' }));
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Any number' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(sendBtn()).toHaveAccessibleName('Send SPICE · ∞');
    await act(async () => void fireEvent.click(sendBtn()));
    expect(send()).toHaveBeenCalledWith({ type: 'clue', word: 'spice', number: 'inf' });
  });

  it('shows a refused send as a plain sentence', async () => {
    phone();
    state.send = vi.fn().mockResolvedValue({
      ok: false,
      error: new ApiError(403, 'not_your_turn'),
    } satisfies SendResult);
    atKey();
    fireEvent.change(field(), { target: { value: 'spice' } });
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    await act(async () => void fireEvent.click(sendBtn()));
    expect(screen.getByRole('alert')).toHaveTextContent('It isn’t your turn any more.');
  });

  it('disables the controls while reconnecting', () => {
    phone({}, { conn: 'reconnecting' });
    atKey();
    expect(screen.getByText('Reconnecting…')).toBeVisible();
    fireEvent.change(field(), { target: { value: 'spice' } });
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(sendBtn()).toBeDisabled();
  });
});

describe('spoken mode', () => {
  it('takes only the number and reads "Clue given · 2"', async () => {
    phone({ rules: { ...G.rules, clueEntry: 'spoken' } });
    atKey();
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    const btn = screen.getByRole('button', { name: 'Clue given · 2' });
    await act(async () => void fireEvent.click(btn));
    expect(send()).toHaveBeenCalledWith({ type: 'clue', word: null, number: 2 });
  });
});

describe('the other team’s turn', () => {
  const theirs = {
    turn: 'moon' as const,
    clue: { team: 'moon' as const, word: 'storm', number: 3 },
  };

  it('shows their clue and the timer, and Not allowed asks before it sends', async () => {
    vi.useFakeTimers({ now: 1_000_000, toFake: ['Date'] });
    phone({ ...theirs, deadline: 1_000_000 + 72_000 });
    atKey();
    expect(screen.getByText('Dev’s clue: STORM · 3')).toBeVisible();
    expect(screen.getByRole('timer')).toHaveTextContent('1:12 left');
    fireEvent.click(screen.getByRole('button', { name: 'Not allowed' }));
    expect(send()).not.toHaveBeenCalled();
    const yes = screen.getByRole('button', { name: 'Yes, not allowed' });
    expect(yes).toHaveFocus();
    await act(async () => void fireEvent.click(yes));
    expect(send()).toHaveBeenCalledWith({ type: 'notAllowed' });
    vi.useRealTimers();
  });

  it('turns Not allowed off once they have guessed', () => {
    phone({ ...theirs, guessedThisTurn: 1 });
    atKey();
    expect(screen.getByRole('button', { name: 'Not allowed' })).toBeDisabled();
    expect(screen.getByText(/this clue stands/)).toBeVisible();
  });

  it('shows a spoken clue as given, with Not allowed still on', () => {
    phone({ ...theirs, clue: { team: 'moon', word: null, number: 2 } });
    atKey();
    expect(screen.getByText('Dev: clue given · 2')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Not allowed' })).toBeEnabled();
  });
});

describe('penalty pick', () => {
  it('lets this phone reveal one of its own face-down words, after a confirm', async () => {
    const revealed = G.revealed.slice();
    revealed[1] = 'sun';
    phone({ turn: 'sun', pending: { penaltyFor: 'moon', since: 0 }, revealed });
    atKey();
    expect(screen.getByRole('heading', { name: 'Pick one of your words to reveal' })).toBeVisible();
    // Only Sun's face-down words are buttons.
    expect(screen.getByRole('button', { name: 'RIVER, Sun’s word' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /KITE/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /OCEAN, Moon/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'RIVER, Sun’s word' }));
    expect(send()).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Choose another' }));
    fireEvent.click(screen.getByRole('button', { name: 'TRAIN, Sun’s word' }));
    await act(
      async () => void fireEvent.click(screen.getByRole('button', { name: 'Reveal TRAIN' })),
    );
    expect(send()).toHaveBeenCalledWith({ type: 'penaltyReveal', card: 2 });
  });

  it('tells the team that was ruled against to wait', () => {
    phone({ turn: 'moon', pending: { penaltyFor: 'sun', since: 0 } });
    atKey();
    expect(screen.getByText(/Your clue was ruled out/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Sun’s word/ })).toBeNull();
  });
});

describe('game states', () => {
  it('waits for the game to start', () => {
    phone({ status: 'waiting' });
    atKey();
    expect(screen.getByRole('heading', { name: 'Waiting for the game to start' })).toBeVisible();
  });

  it('shows the result and follows the table into the next game', () => {
    phone({ status: 'finished', winner: 'sun', endedBy: 'all-found', next: 'next-id' });
    atKey();
    expect(screen.getByRole('heading', { name: /Sun wins/ })).toBeVisible();
    expect(screen.getByText(/Your team won/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next game' }));
    expect(seen.nav).toEqual({ screen: 'key', gameId: 'next-id', role: 'clue' });
  });

  it('offers Back to your games when there is no next game', () => {
    phone({ status: 'finished', winner: 'moon', endedBy: 'trap' });
    vi.mocked(useYourGames).mockReturnValue(remote([]));
    atKey();
    expect(screen.getByText(/Your team lost/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to your games' }));
    expect(seen.nav?.screen).toBe('clue-list');
  });
});

describe('the key is never stored', () => {
  it('writes nothing to localStorage, IndexedDB, the URL or the title', async () => {
    const put = vi.fn(async () => {});
    resetArchive({ ...memoryBackend(), put });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    phone();
    atKey();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'spice' } });
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await act(async () => void fireEvent.click(screen.getByRole('button', { name: /^Send/ })));
    fireEvent.click(screen.getByRole('button', { name: 'Hide key' }));
    const written = JSON.stringify([setItem.mock.calls, put.mock.calls]);
    expect(written).not.toContain('"trap"');
    expect(written).not.toContain(JSON.stringify(KEY));
    expect(put).not.toHaveBeenCalled();
    expect(location.href + document.title).not.toMatch(/sun|moon|trap|blank/i);
    setItem.mockRestore();
  });
});

function remote(data: IshaaraSummaryOut[] | null, o: Partial<Remote<IshaaraSummaryOut[]>> = {}) {
  return {
    data,
    fetchedAt: null,
    loading: false,
    error: null,
    offline: false,
    reload: vi.fn(),
    ...o,
  } satisfies Remote<IshaaraSummaryOut[]>;
}
const summary: IshaaraSummaryOut = {
  id: 'g1',
  createdAt: Date.now() - 120_000,
  updatedAt: Date.now(),
  finishedAt: null,
  status: 'active',
  turn: 'sun',
  starting: 'sun',
  winner: null,
  endedBy: null,
  match: { game: 1, sunWins: 0, moonWins: 0 },
  wordsLeft: { sun: 9, moon: 8 },
  revealed: 0,
  host: { name: 'Jay' },
  players: G.players.map((p) => ({ ...p, playerId: p.playerId ?? '' })),
  myTeam: 'sun',
};

describe('Your games', () => {
  const LIST: IshaaraNav = { screen: 'clue-list', gameId: null, role: 'clue' };

  it('lists the games where this account is a clue-giver and opens one at its key', () => {
    phone();
    vi.mocked(useYourGames).mockReturnValue(remote([summary]));
    mount(LIST);
    expect(
      screen.getByRole('heading', { name: 'You’re Sun’s clue-giver in Jay’s game' }),
    ).toBeVisible();
    expect(screen.getByText('Ishaara · started 2 min ago · 4 players')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Open your key' }));
    expect(seen.nav).toEqual({ screen: 'key', gameId: 'g1', role: 'clue' });
    expect(screen.getByRole('heading', { name: 'Make sure nobody else can see' })).toBeVisible();
  });

  it('has loading, empty and error states', () => {
    vi.mocked(useYourGames).mockReturnValue(remote(null, { loading: true }));
    const { rerender } = mount(LIST);
    expect(screen.getByRole('status')).toHaveTextContent('Looking for your games');
    vi.mocked(useYourGames).mockReturnValue(remote([]));
    rerender(
      <IshaaraProvider initial={LIST}>
        <ClueHome />
      </IshaaraProvider>,
    );
    expect(screen.getByRole('heading', { name: 'No games for you right now' })).toBeVisible();
    const failed = remote(null, { error: new ApiError(500, 'server') });
    vi.mocked(useYourGames).mockReturnValue(failed);
    rerender(
      <IshaaraProvider initial={LIST}>
        <ClueHome />
      </IshaaraProvider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load your games.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(failed.reload).toHaveBeenCalled();
  });
});
