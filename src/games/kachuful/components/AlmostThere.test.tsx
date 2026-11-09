import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/games/kachuful/state/store';
import { archive } from '@/state/archive';
import { KEYS } from '@/state/persistence';
import { ep } from '@/sync/endpoints';
import { AlmostThere } from './AlmostThere';

const signIn = () =>
  localStorage.setItem(
    KEYS.session,
    JSON.stringify({
      user: { id: 'u1', email: 'me@test.dev', role: 'member', playerId: 'me' },
      player: { id: 'me', displayName: 'Me' },
    }),
  );

const withTotals = async (totals: Record<string, number>) => {
  signIn();
  vi.spyOn(ep, 'player').mockResolvedValue({
    data: {
      player: { id: 'me', displayName: 'Me' },
      totals: { gamesEnded: 0, rounds: 0, made: 0, longestHot: 0, longestCold: 0, ...totals },
      achievements: [],
      rank: { global: null, outOf: 0 },
    },
    status: 200,
    etag: null,
  } as never);
  await archive.ready;
  render(
    <AppProvider>
      <AlmostThere />
    </AppProvider>,
  );
};

describe('almost there, on Home', () => {
  afterEach(() => vi.restoreAllMocks());

  it('names the next level I am closest to', async () => {
    await withTotals({ gamesEnded: 48, rounds: 300, longestCold: 11 });
    expect(await screen.findByText('50 games')).toBeInTheDocument();
    expect(screen.getByText('Games 48 / 50')).toBeInTheDocument();
  });

  it('stays away until something is at least half way', async () => {
    await withTotals({ gamesEnded: 3, rounds: 20 });
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Almost there')).not.toBeInTheDocument();
  });
});
