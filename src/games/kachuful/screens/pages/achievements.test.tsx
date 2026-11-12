import { render, screen, within } from '@testing-library/react';
import { AppProvider } from '@/games/kachuful/state/store';
import { archive } from '@/state/archive';
import { KEYS } from '@/state/persistence';
import { ep } from '@/sync/endpoints';
import type { Achievement } from '@/sync/types';
import { AchievementsPage } from './AchievementsPage';

const won = (code: string, playerId: string, earnedAt = 1): Achievement => ({
  id: `${code}-${playerId}-${earnedAt}`,
  code,
  playerId,
  gameId: 'g',
  roundIndex: null,
  period: null,
  earnedAt,
  data: {},
});

const signIn = () =>
  localStorage.setItem(
    KEYS.session,
    JSON.stringify({
      user: { id: 'u1', email: 'me@test.dev', role: 'member', playerId: null },
      player: null,
    }),
  );

const show = async (id?: string) => {
  await archive.ready;
  render(
    <AppProvider>
      <AchievementsPage id={id} />
    </AppProvider>,
  );
};

describe('achievements, signed in', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reads every page of the list, not just the newest', async () => {
    signIn();
    const list = vi
      .spyOn(ep, 'achievements')
      .mockResolvedValueOnce({ items: [won('hot_3', 'x')], nextCursor: 'c1' })
      .mockResolvedValueOnce({ items: [won('perfect_game', 'x')], nextCursor: null });
    await show();
    const summary = await screen.findByRole('region', { name: 'Achievements unlocked' });
    await within(summary).findByText(/^2/);
    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[1][1]).toBe('c1');
  });

  it('marks what came since the last visit as new, and says how rare each one is', async () => {
    signIn();
    localStorage.setItem(KEYS.achSeen, JSON.stringify({ x: 5 }));
    vi.spyOn(ep, 'player').mockRejectedValue(new Error('offline'));
    vi.spyOn(ep, 'achievements').mockResolvedValue({
      items: [
        won('perfect_game', 'x', 10),
        won('winner', 'x', 1),
        ...['x', 'y', 'z', 'w'].map((p) => won('wooden_spoon', p, 1)),
      ],
      nextCursor: null,
    });
    await show('x');
    const perfect = (await screen.findByText('Perfect game')).closest('li')!;
    expect(within(perfect).getByText('New')).toBeInTheDocument();
    expect(within(perfect).getByText('Rare')).toBeInTheDocument();
    expect(within(perfect).getByText('1 of 4 players')).toBeInTheDocument();
    const spoon = screen.getByText('Wooden spoon').closest('li')!;
    expect(within(spoon).queryByText('New')).not.toBeInTheDocument();
    expect(within(spoon).queryByText('Rare')).not.toBeInTheDocument();
    expect(within(spoon).getByText('4 of 4 players')).toBeInTheDocument();
    expect(screen.getAllByText('New')).toHaveLength(1);
    // Only the new medal is stamped: it alone carries the ring that pulses behind it.
    const ring = '[aria-hidden] > .pointer-events-none.rounded-full';
    expect(perfect.querySelector(ring)).not.toBeNull();
    expect(document.querySelectorAll(ring)).toHaveLength(1);
    // This visit is remembered, so the same achievements are not new next time.
    expect(JSON.parse(localStorage.getItem(KEYS.achSeen)!).x).toBeGreaterThan(5);
  });

  it('marks nothing new the first time a player is opened', async () => {
    signIn();
    vi.spyOn(ep, 'player').mockRejectedValue(new Error('offline'));
    vi.spyOn(ep, 'achievements').mockResolvedValue({
      items: [won('perfect_game', 'x', 10)],
      nextCursor: null,
    });
    await show('x');
    await screen.findByText(/^Earned · /);
    expect(screen.queryByText('New')).not.toBeInTheDocument();
  });
});
