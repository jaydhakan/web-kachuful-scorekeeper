import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { IshaaraPublic, LogEntry } from '@/games/ishaara/domain';
import { plainKey, started, T0 } from '@/games/ishaara/domain/__fixtures__/kit';
import type {
  IshaaraLeaderboardOut,
  IshaaraPlayerStatsOut,
  IshaaraSummaryOut,
  IshaaraVsOut,
} from '@/games/ishaara/sync/types';
import type { IshaaraHistory } from '@/games/ishaara/state/lists';
import { ApiError } from '@/sync/api';
import { setSession } from '@/sync/session';
import type { Remote } from '@/sync/useRemote';
import { ClueLog } from './ClueLog';
import HubPage from './HubPage';

const h = vi.hoisted(() => ({
  history: vi.fn(),
  game: vi.fn(),
  del: vi.fn(),
  board: vi.fn(),
  stats: vi.fn(),
  vs: vi.fn(),
}));

vi.mock('@/games/ishaara/state/lists', () => ({
  useIshaaraHistory: h.history,
  useIshaaraGame: h.game,
  deleteIshaaraGame: h.del,
  useIshaaraLeaderboard: h.board,
  useIshaaraPlayerStats: h.stats,
  useIshaaraHeadToHead: h.vs,
}));

const remote = <T,>(o: Partial<Remote<T>> = {}): Remote<T> => ({
  data: null,
  fetchedAt: null,
  loading: false,
  error: null,
  offline: false,
  reload: vi.fn(),
  ...o,
});

const hist = (o: Partial<IshaaraHistory> = {}): IshaaraHistory => ({
  items: [],
  loading: false,
  error: null,
  offline: false,
  hasMore: false,
  loadingMore: false,
  more: vi.fn(),
  reload: vi.fn(),
  ...o,
});

const G1 = '50000000-0000-4000-8000-000000000001';
const { state: base } = started();
const [riya, arjun, dev] = base.players;

const LOG: LogEntry[] = [
  { at: T0, team: 'sun', type: 'clue', word: 'water', number: 2 },
  { at: T0, team: 'moon', type: 'not-allowed' },
  { at: T0, team: 'moon', type: 'penalty', card: 9, word: base.words[9], identity: 'moon' },
  { at: T0, team: 'moon', type: 'clue', number: 'inf' },
  { at: T0, team: 'moon', type: 'guess', card: 10, word: base.words[10], identity: 'moon' },
  { at: T0, team: 'moon', type: 'undo', card: 11, word: base.words[11] },
  { at: T0, team: 'moon', type: 'end' },
  { at: T0, team: 'sun', type: 'clue', word: 'fruit', number: 1 },
  { at: T0, team: 'sun', type: 'guess', card: 17, word: base.words[17], identity: 'blank' },
  { at: T0, team: 'moon', type: 'clue', word: 'sky', number: 0 },
  { at: T0, team: 'moon', type: 'timeout' },
  { at: T0, team: 'sun', type: 'skip' },
  { at: T0, team: 'sun', type: 'clue', word: 'spook', number: 1 },
  { at: T0, team: 'sun', type: 'guess', card: 24, word: base.words[24], identity: 'trap' },
];

const finished: IshaaraPublic = {
  ...base,
  status: 'finished',
  winner: 'moon',
  endedBy: 'trap',
  finishedAt: T0 + 60_000,
  solution: plainKey('sun'),
  revealed: base.revealed.map((_, i) => ([9, 10, 17, 24].includes(i) ? plainKey('sun')[i] : null)),
  log: LOG,
};

const summary = (o: Partial<IshaaraSummaryOut> = {}): IshaaraSummaryOut => ({
  id: G1,
  createdAt: T0,
  updatedAt: T0 + 60_000,
  finishedAt: T0 + 60_000,
  status: 'finished',
  turn: 'sun',
  starting: 'sun',
  winner: 'moon',
  endedBy: 'trap',
  match: { game: 1, sunWins: 0, moonWins: 1 },
  wordsLeft: { sun: 9, moon: 6 },
  revealed: 4,
  host: { name: 'Riya' },
  players: base.players.map((p) => ({
    playerId: p.playerId!,
    name: p.name,
    emoji: p.emoji,
    color: p.color,
    team: p.team,
    role: p.role,
  })),
  myTeam: null,
  ...o,
});

const person = (id: string, name: string) => ({
  id,
  displayName: name,
  emoji: '🙂',
  color: '#c0ffee',
  photoUrl: null,
  games: 3,
  lastPlayedAt: null,
  createdByName: 'x',
});
const tallyOf = (o: Partial<IshaaraPlayerStatsOut> = {}): IshaaraPlayerStatsOut => ({
  games: 4,
  wins: 3,
  winRate: 0.75,
  wordsFound: 12,
  wrongPicks: 2,
  trapHits: 1,
  clueGames: 2,
  clueWins: 1,
  cluesGiven: 7,
  avgClueNumber: 1.5,
  penalties: 1,
  ...o,
});
const BOARD: IshaaraLeaderboardOut = {
  period: 'season',
  sort: 'rate',
  generatedAt: 0,
  rows: [
    { ...tallyOf(), rank: 1, player: person('p1', 'Zoya') as never, value: 0.75 },
    {
      ...tallyOf({ games: 1, wins: 1, winRate: 1 }),
      rank: null,
      player: person('p2', 'Ishan') as never,
      value: 1,
    },
  ],
};

beforeEach(() => {
  h.history.mockReturnValue(hist());
  h.game.mockReturnValue({ game: null, host: null, loading: true, error: null });
  h.board.mockReturnValue(remote());
  h.stats.mockReturnValue(remote());
  h.vs.mockReturnValue(remote());
  h.del.mockReset();
});

const hub = (page: 'history' | 'leaderboard' | 'rules', onBack = vi.fn()) =>
  render(<HubPage page={page} onBack={onBack} />);

describe('History', () => {
  it('shows placeholders while loading', async () => {
    h.history.mockReturnValue(hist({ loading: true }));
    hub('history');
    expect(await screen.findByLabelText('Loading')).toHaveAttribute('aria-busy', 'true');
  });

  it('says when there are no games', () => {
    hub('history');
    expect(screen.getByRole('heading', { name: 'No games yet' })).toBeInTheDocument();
  });

  it('shows an error with a retry', () => {
    const reload = vi.fn();
    h.history.mockReturnValue(hist({ error: new ApiError(500, 'server'), reload }));
    hub('history');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reload).toHaveBeenCalled();
  });

  it('lists games with winner, how, teams, and pages on with more', () => {
    const more = vi.fn();
    h.history.mockReturnValue(hist({ items: [summary()], hasMore: true, more }));
    hub('history');
    const row = screen.getByRole('button', { name: /Moon won · the other team hit the trap/ });
    expect(row).toHaveAccessibleName(/Sun\s*Riya, Arjun\s*Moon\s*Dev, Meera/);
    expect(within(row).getByText('Words left · Sun 9 · Moon 6')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show more games' }));
    expect(more).toHaveBeenCalled();
  });

  it('shows a best-of-three match score', () => {
    h.history.mockReturnValue(
      hist({ items: [summary({ match: { game: 2, sunWins: 1, moonWins: 1 } })] }),
    );
    hub('history');
    expect(screen.getByText('Game 2 · Sun 1–1 Moon')).toBeInTheDocument();
  });

  it('offline, reads the games kept on this device and says so', () => {
    h.history.mockReturnValue(hist({ offline: true, items: [summary()] }));
    hub('history');
    expect(screen.getByRole('status')).toHaveTextContent('Offline');
    expect(screen.getByRole('button', { name: /Moon won/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more games' })).not.toBeInTheDocument();
  });

  it('offline with nothing kept, says what to do rather than showing an error', () => {
    h.history.mockReturnValue(hist({ offline: true, error: new ApiError(0, 'offline') }));
    hub('history');
    expect(
      screen.getByRole('heading', { name: 'Nothing kept on this device' }),
    ).toBeInTheDocument();
  });

  it('filters by player, with a no-results state', () => {
    const other = summary({
      id: 'g2',
      players: summary().players.filter((p) => p.name !== 'Meera'),
    });
    h.history.mockReturnValue(hist({ items: [summary(), other] }));
    hub('history');
    fireEvent.click(screen.getByRole('button', { name: 'Meera' }));
    expect(screen.getAllByRole('button', { name: /Moon won/ })).toHaveLength(1);
  });

  it('opens a game and comes back; Back at the bottom leaves the hub', () => {
    const onBack = vi.fn();
    h.history.mockReturnValue(hist({ items: [summary()] }));
    h.game.mockReturnValue({ game: finished, host: null, loading: false, error: null });
    hub('history', onBack);
    fireEvent.click(screen.getByRole('button', { name: /Moon won/ }));
    expect(screen.getByRole('list', { name: 'The key' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('a game', () => {
  const open = () => {
    h.history.mockReturnValue(hist({ items: [summary()] }));
    hub('history');
    fireEvent.click(screen.getByRole('button', { name: /Moon won/ }));
  };

  it('loads, then fails with a retry, or is gone', async () => {
    open();
    expect(await screen.findByLabelText('Loading')).toBeInTheDocument();
    cleanupAnd(() => {
      h.game.mockReturnValue({
        game: null,
        host: null,
        loading: false,
        error: new ApiError(500, 'server'),
      });
      open();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });
    cleanupAnd(() => {
      h.game.mockReturnValue({
        game: null,
        host: null,
        loading: false,
        error: new ApiError(404, 'not_found'),
      });
      open();
      expect(screen.getByRole('heading', { name: 'Game not found' })).toBeInTheDocument();
    });
  });

  it('shows the whole key with identities and which were picked', () => {
    h.game.mockReturnValue({ game: finished, host: null, loading: false, error: null });
    open();
    const key = screen.getByRole('list', { name: 'The key' });
    expect(within(key).getAllByRole('img')).toHaveLength(25);
    expect(within(key).getByRole('img', { name: `${base.words[24]}, Trap` })).toBeInTheDocument();
    expect(
      within(key).getByRole('img', { name: `${base.words[0]}, Sun’s word, never picked` }),
    ).toBeInTheDocument();
  });

  it('lets an admin delete it after confirming', async () => {
    setSession({
      user: { id: 'u1', email: 'a@b.c', role: 'admin', playerId: null },
      player: null,
    });
    h.del.mockResolvedValue(undefined);
    h.game.mockReturnValue({ game: finished, host: null, loading: false, error: null });
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Delete game' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    await act(async () => {});
    expect(h.del).toHaveBeenCalledWith(finished.id);
    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
  });

  it('shows delete only to the host or an admin, and says why it failed', async () => {
    setSession({
      user: { id: 'u2', email: 'd@b.c', role: 'member', playerId: dev.playerId! },
      player: { id: dev.playerId!, displayName: 'Dev', emoji: '🙂', color: '#fff' },
    });
    h.game.mockReturnValue({ game: finished, host: false, loading: false, error: null });
    open();
    expect(screen.queryByRole('button', { name: 'Delete game' })).not.toBeInTheDocument();
    cleanupAnd(() => {
      h.game.mockReturnValue({ game: finished, host: true, loading: false, error: null });
      setSession({
        user: { id: 'u3', email: 'r@b.c', role: 'member', playerId: riya.playerId! },
        player: { id: riya.playerId!, displayName: 'Riya', emoji: '🙂', color: '#fff' },
      });
      h.del.mockRejectedValue(new ApiError(403, 'forbidden'));
      open();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete game' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    await act(async () => {});
    expect(screen.getByRole('alert')).toHaveTextContent('Only the host or an admin');
  });

  it('opens a seated player’s stats', () => {
    h.game.mockReturnValue({ game: finished, host: null, loading: false, error: null });
    h.stats.mockReturnValue(remote({ data: tallyOf() }));
    open();
    fireEvent.click(screen.getByRole('button', { name: `${arjun.name}’s stats` }));
    expect(screen.getByRole('heading', { name: arjun.name })).toBeInTheDocument();
  });
});

describe('the clue log', () => {
  it('renders every kind of entry, turn by turn', () => {
    render(<ClueLog game={finished} />);
    const log = screen.getByRole('list', { name: 'Every clue and pick, in order' });
    const turns = within(log)
      .getAllByRole('listitem')
      .filter((li) => li.parentElement === log);
    expect(turns).toHaveLength(5);
    expect(turns[0]).toHaveTextContent('Riya gave');
    expect(turns[0]).toHaveTextContent('WATER · 2');
    expect(turns[0]).toHaveTextContent('Moon called the clue not allowed');
    expect(turns[0]).toHaveTextContent(
      `Moon revealed ${base.words[9].toUpperCase()} as the penalty`,
    );
    expect(turns[1]).toHaveTextContent('Clue said aloud · ∞');
    expect(turns[1]).toHaveTextContent(`Picked ${base.words[10].toUpperCase()} · Moon’s word`);
    expect(turns[1]).toHaveTextContent(`Took back ${base.words[11].toUpperCase()}`);
    expect(turns[1]).toHaveTextContent('Ended the turn');
    expect(turns[2]).toHaveTextContent('· Blank');
    expect(turns[3]).toHaveTextContent('SKY · 0');
    expect(turns[3]).toHaveTextContent('Time ran out');
    expect(turns[3]).toHaveTextContent('Sun didn’t pick a word in time · skipped');
    expect(turns[4]).toHaveTextContent('· Trap');
  });

  it('says when no clue was given', () => {
    render(<ClueLog game={{ ...finished, log: [] }} />);
    expect(screen.getByText('No clues were given.')).toBeInTheDocument();
  });
});

describe('Leaderboard', () => {
  it('loads, errors with a retry, and is empty with a way to all time', async () => {
    h.board.mockReturnValue(remote({ loading: true }));
    const r = hub('leaderboard');
    expect(await screen.findByLabelText('Loading')).toBeInTheDocument();
    const reload = vi.fn();
    h.board.mockReturnValue(remote({ error: new ApiError(500, 'server'), reload }));
    r.rerender(<HubPage page="leaderboard" onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reload).toHaveBeenCalled();
    h.board.mockReturnValue(remote({ data: { ...BOARD, rows: [] } }));
    r.rerender(<HubPage page="leaderboard" onBack={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Nothing in this period' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show all time' }));
    expect(h.board).toHaveBeenLastCalledWith('all', 'wins');
  });

  it('ranks rows, puts the unranked after with the games-to-rank note, and opens a player', () => {
    h.board.mockReturnValue(remote({ data: BOARD }));
    h.stats.mockReturnValue(remote({ data: tallyOf() }));
    hub('leaderboard');
    fireEvent.click(screen.getByRole('button', { name: 'Win %' }));
    expect(h.board).toHaveBeenLastCalledWith('season', 'rate');
    expect(screen.getByRole('button', { name: '#1, Zoya, 75%' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Plays 3 games to rank' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unranked, Ishan, 100%' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '#1, Zoya, 75%' }));
    expect(screen.getByRole('heading', { name: 'Zoya' })).toBeInTheDocument();
  });
});

describe('Player stats and head-to-head', () => {
  const toZoya = () => {
    h.board.mockReturnValue(remote({ data: BOARD }));
    hub('leaderboard');
    fireEvent.click(screen.getByRole('button', { name: /Zoya/ }));
  };

  it('shows guessing and clue-giving numbers', () => {
    h.stats.mockReturnValue(remote({ data: tallyOf() }));
    toZoya();
    expect(screen.getByText('Words found').nextSibling).toHaveTextContent('12');
    expect(screen.getByText('Trap hits').nextSibling).toHaveTextContent('1');
    expect(screen.getByText('Average number').nextSibling).toHaveTextContent('1.5');
    expect(screen.getByText('Penalties').nextSibling).toHaveTextContent('1');
  });

  it('loading, error and no games', async () => {
    h.stats.mockReturnValue(remote({ loading: true }));
    toZoya();
    expect(await screen.findByLabelText('Loading')).toBeInTheDocument();
    cleanupAnd(() => {
      h.stats.mockReturnValue(remote({ error: new ApiError(500, 'server') }));
      toZoya();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    });
    cleanupAnd(() => {
      h.stats.mockReturnValue(remote({ data: tallyOf({ games: 0 }) }));
      toZoya();
      expect(screen.getByRole('heading', { name: 'No finished games yet' })).toBeInTheDocument();
    });
  });

  it('opens head-to-head with another player', () => {
    h.stats.mockReturnValue(remote({ data: tallyOf() }));
    const vs: IshaaraVsOut = {
      a: person('p1', 'Zoya') as never,
      b: person('p2', 'Ishan') as never,
      games: 5,
      together: 2,
      togetherWins: 1,
      against: 3,
      aWins: 2,
      bWins: 1,
    };
    h.vs.mockReturnValue(remote({ data: vs }));
    toZoya();
    fireEvent.click(screen.getByRole('button', { name: 'Zoya and Ishan, head to head' }));
    expect(h.vs).toHaveBeenLastCalledWith('p1', 'p2');
    expect(screen.getByText('Zoya won').nextSibling).toHaveTextContent('2');
    expect(screen.getByText('Ishan won').nextSibling).toHaveTextContent('1');
  });

  it('head-to-head says when they have not played together', () => {
    h.stats.mockReturnValue(remote({ data: tallyOf() }));
    h.vs.mockReturnValue(
      remote({
        data: {
          a: {},
          b: {},
          games: 0,
          together: 0,
          togetherWins: 0,
          against: 0,
          aWins: 0,
          bWins: 0,
        } as never,
      }),
    );
    toZoya();
    fireEvent.click(screen.getByRole('button', { name: 'Zoya and Ishan, head to head' }));
    expect(screen.getByRole('heading', { name: 'Not in the same game yet' })).toBeInTheDocument();
  });
});

describe('How to play', () => {
  it('explains the game with a legend of the four cards', () => {
    hub('rules');
    expect(screen.getByRole('heading', { name: 'How to play' })).toBeInTheDocument();
    for (const name of ['Giving a clue', 'Guessing', 'What a pick does', 'Winning'])
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'GHOST, Trap' })).toBeInTheDocument();
    expect(screen.getByText('Moon’s word: a crescent')).toBeInTheDocument();
  });
});

/** Starts over in a fresh render, for a second state in one test. */
function cleanupAnd(f: () => void) {
  cleanup();
  f();
}
