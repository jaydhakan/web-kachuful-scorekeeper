import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '@/games/kachuful/state/store';
import { archive } from '@/state/archive';
import { KEYS } from '@/state/persistence';
import { monthOf } from '@/games/kachuful/domain';
import { ep } from '@/sync/endpoints';
import type { LeaderboardRow } from '@/sync/types';
import { AwardsPage } from './AwardsPage';

const ok = <T,>(data: T) => ({ data, status: 200, etag: null });
const row = (id: string, rank: number | null, value: number, rounds = 60) =>
  ({
    player: { id, displayName: id.toUpperCase() },
    rank,
    qualified: rank != null,
    value,
    rounds,
  }) as unknown as LeaderboardRow;

const signIn = (playerId: string) =>
  localStorage.setItem(
    KEYS.session,
    JSON.stringify({
      user: { id: 'u1', email: 'me@test.dev', role: 'member', playerId },
      player: { id: playerId, displayName: playerId.toUpperCase() },
    }),
  );

const champ = (season: string, id: string | null) => ({
  season,
  champion: id ? { id, displayName: id } : null,
});

const openSeason = async (
  standings: LeaderboardRow[],
  seasons: ReturnType<typeof champ>[] = [],
) => {
  vi.spyOn(ep, 'daily').mockResolvedValue(ok({ awards: [], final: false }) as never);
  vi.spyOn(ep, 'seasons').mockResolvedValue(ok(seasons) as never);
  vi.spyOn(ep, 'season').mockResolvedValue(
    ok({ season: monthOf(Date.now()), final: false, standings, awards: [] }) as never,
  );
  await archive.ready;
  render(
    <AppProvider>
      <AwardsPage />
    </AppProvider>,
  );
  await userEvent
    .setup({ pointerEventsCheck: 0 })
    .click(screen.getByRole('button', { name: /Season/ }));
};

describe('the season tab, signed in', () => {
  afterEach(() => vi.restoreAllMocks());

  it('says how far I am behind the next rank up', async () => {
    signIn('me');
    await openSeason([row('a', 1, 9.4), row('b', 2, 8.1), row('me', 3, 7.5)]);
    expect(await screen.findByText("You're 3rd · 0.6 pts/round behind 2nd")).toBeInTheDocument();
  });

  it('counts the rounds I still need to be ranked', async () => {
    signIn('me');
    await openSeason([row('a', 1, 9.4), row('me', null, 12, 32)]);
    expect(await screen.findByText('19 more rounds to get ranked')).toBeInTheDocument();
  });

  it('hangs past champions on a wall, with the most titles named, and skips this month', async () => {
    signIn('me');
    const now = monthOf(Date.now());
    await openSeason(
      [row('Juhi', 1, 9)],
      [
        champ('2026-08', 'Juhi'),
        champ('2026-09', 'Juhi'),
        champ('2026-10', null),
        champ(now, 'Bo'),
      ],
    );
    expect(await screen.findByText('Past champions')).toBeInTheDocument();
    expect(screen.getByText('Most titles: Juhi ×2')).toBeInTheDocument();
    expect(screen.getByText('No champion')).toBeInTheDocument();
    expect(screen.queryByText('Bo')).not.toBeInTheDocument();
  });
});
