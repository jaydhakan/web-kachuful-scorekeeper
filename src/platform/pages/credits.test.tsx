import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/games/kachuful/state/store';
import { archive } from '@/state/archive';
import { KEYS } from '@/state/persistence';
import { ep } from '@/sync/endpoints';
import type { LeaderboardRow } from '@/sync/types';
import { CreditsPage } from './CreditsPage';

const row = (name: string, games: number, rounds: number) =>
  ({ player: { id: name, displayName: name }, games, rounds }) as LeaderboardRow;

const signIn = () =>
  localStorage.setItem(
    KEYS.session,
    JSON.stringify({
      user: { id: 'u1', email: 'me@test.dev', role: 'member', playerId: null },
      player: null,
    }),
  );

const show = async () => {
  await archive.ready;
  render(
    <AppProvider>
      <CreditsPage />
    </AppProvider>,
  );
};

describe('the regulars on Credits', () => {
  afterEach(() => vi.restoreAllMocks());

  it('is hidden and never asks the server when signed out', async () => {
    const lb = vi.spyOn(ep, 'leaderboard');
    await show();
    expect(screen.getByText('Tested by')).toBeInTheDocument();
    expect(screen.queryByText('The regulars')).not.toBeInTheDocument();
    expect(lb).not.toHaveBeenCalled();
  });

  it('lists the most rounds among players with 100+ rounds, signed in', async () => {
    signIn();
    const lb = vi.spyOn(ep, 'leaderboard').mockResolvedValue({
      data: { rows: [row('Bo', 80, 700), row('Asha', 49, 90)], minRounds: 0, generatedAt: 0 },
      status: 200,
      etag: null,
    });
    await show();
    const item = await screen.findByRole('listitem');
    expect(item).toHaveTextContent('Bo');
    expect(item).toHaveTextContent('700 rounds');
    expect(screen.queryByText('Asha')).not.toBeInTheDocument();
    expect(lb.mock.calls[0][4]).toEqual({ limit: 10 });
  });

  it('says how to join when nobody has 100 rounds yet', async () => {
    signIn();
    vi.spyOn(ep, 'leaderboard').mockResolvedValue({
      data: { rows: [row('Asha', 3, 30)], minRounds: 0, generatedAt: 0 },
      status: 200,
      etag: null,
    });
    await show();
    expect(await screen.findByText('Play 100 rounds to join the regulars.')).toBeInTheDocument();
  });
});
