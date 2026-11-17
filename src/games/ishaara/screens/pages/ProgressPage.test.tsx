import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { awardValue } from '@/games/ishaara/progression';
import type { IshaaraPlayerStatsOut } from '@/games/ishaara/sync/types';
import { archive } from '@/state/archive';
import { ep } from '@/sync/endpoints';
import { resetSessionForTests, setSession } from '@/sync/session';
import type { Remote } from '@/sync/useRemote';
import HubPage from './HubPage';
import { HubNavCtx } from './parts';
import { PlayerPage } from './PlayerPage';

const h = vi.hoisted(() => ({ stats: vi.fn(), board: vi.fn() }));
vi.mock('@/games/ishaara/state/lists', () => ({
  useIshaaraHistory: vi.fn(),
  useIshaaraGame: vi.fn(),
  deleteIshaaraGame: vi.fn(),
  useIshaaraLeaderboard: h.board,
  useIshaaraPlayerStats: h.stats,
  useIshaaraHeadToHead: vi.fn(),
}));

const ok = <T,>(data: T) => ({ data, status: 200, etag: null });
const remote = <T,>(data: T | null): Remote<T> => ({
  data,
  fetchedAt: null,
  loading: false,
  error: null,
  offline: false,
  reload: vi.fn(),
});
const ME = '00000000-0000-4000-8000-000000000001';

beforeEach(async () => {
  await archive.ready;
  setSession({
    user: { id: 'u1', email: 'a@b.c', role: 'member', playerId: ME },
    player: { id: ME, displayName: 'Riya', emoji: '🦊', color: '#ff8a65' },
  });
  vi.spyOn(ep, 'daily').mockResolvedValue(
    ok({
      date: '',
      final: false,
      awards: [
        { code: 'day_speed', player: { id: ME }, value: 245e3, gameId: null, roundIndex: null },
      ],
    }) as never,
  );
  vi.spyOn(ep, 'seasons').mockResolvedValue(ok([]));
  vi.spyOn(ep, 'achievements').mockResolvedValue({
    items: [
      {
        id: 'a1',
        code: 'mind_meld',
        playerId: ME,
        gameId: 'g',
        roundIndex: 0,
        period: null,
        earnedAt: Date.now(),
        data: {},
        gameKind: 'ishaara',
      },
    ],
    nextCursor: null,
  } as never);
  vi.spyOn(ep, 'ladders').mockResolvedValue(
    ok({ gameKind: 'ishaara', playerId: ME, counts: { games: 3, clues: 12 } }) as never,
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  resetSessionForTests();
});

describe('Ishaara’s awards and achievements', () => {
  it('reads values its own way: places as a win rate, the fastest win as a time, cards per clue', () => {
    expect(awardValue({ code: 'season_champion', playerId: 'a', value: 0.625 })).toBe('63%');
    expect(awardValue({ code: 'day_speed', playerId: 'a', value: 245e3 })).toBe('4:05');
    expect(awardValue({ code: 'day_giver', playerId: 'a', value: 7 / 3 })).toBe('2.3 / clue');
    expect(awardValue({ code: 'day_grinder', playerId: 'a', value: 4 })).toBe('4');
  });

  it('Awards shows the day from the server with ?game=ishaara and opens Achievements', async () => {
    render(<HubPage page="awards" onBack={() => {}} />);
    expect(await screen.findByText('Fastest win')).toBeInTheDocument();
    expect(screen.getByText('4:05')).toBeInTheDocument();
    expect(vi.mocked(ep.daily).mock.calls[0][2]).toBe('ishaara');
    await userEvent
      .setup({ pointerEventsCheck: 0 })
      .click(screen.getByRole('button', { name: /Achievements/ }));
    expect(await screen.findByRole('heading', { name: 'Turn moments' })).toBeInTheDocument();
    expect(screen.getByText('Mind meld')).toBeInTheDocument();
  });

  it('a player’s page opens their achievements', async () => {
    h.stats.mockReturnValue(remote<IshaaraPlayerStatsOut>(null));
    h.board.mockReturnValue(remote(null));
    const open = vi.fn();
    render(
      <HubNavCtx.Provider value={{ open, back: () => {} }}>
        <PlayerPage who={{ id: ME, name: 'Riya', emoji: '🦊', color: 'var(--tx2)' }} />
      </HubNavCtx.Provider>,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: /Achievements/ }));
    expect(open).toHaveBeenCalledWith({ page: 'achievements', id: ME });
  });
});
