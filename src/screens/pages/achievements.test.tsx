import { render, screen, within } from '@testing-library/react';
import { AppProvider } from '@/state/store';
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
});
