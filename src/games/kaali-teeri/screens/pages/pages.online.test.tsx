import { screen } from '@testing-library/react';
import { useEffect } from 'react';
import { useKt } from '@/games/kaali-teeri/state/store';
import type { KtLeaderboardRow } from '@/games/kaali-teeri/sync/types';
import { renderKt } from '@/games/kaali-teeri/test/render';
import { archive } from '@/state/archive';
import Pages from './Pages';

const off = {
  data: null,
  fetchedAt: null,
  loading: false,
  error: null,
  offline: false,
  reload: () => {},
  online: false,
};
const row = (id: string, name: string, value: number, handsBid: number): KtLeaderboardRow => ({
  rank: null,
  player: {
    id,
    displayName: name,
    emoji: '🙂',
    color: '#c0ffee',
    games: 3,
    lastPlayedAt: null,
    createdByName: 'x',
  } as KtLeaderboardRow['player'],
  value,
  points: value,
  games: 3,
  wins: 1,
  handsBid,
  bidsMade: handsBid,
  madeRate: 1,
});

vi.mock('@/games/kaali-teeri/sync/boards', () => ({
  useKtLeaderboard: () => ({
    ...off,
    online: true,
    data: {
      period: 'season',
      sort: 'points',
      generatedAt: 0,
      rows: [row('a', 'Zoya', 900, 6), row('b', 'Ishan', 900, 2), row('c', 'Tara', 400, 1)],
    },
  }),
  useKtPlayerStats: () => off,
  useKtHeadToHead: () => off,
}));

function Host() {
  const { state, actions } = useKt();
  useEffect(() => actions.openPage({ page: 'leaderboard' }), [actions]);
  const top = state.pages.at(-1);
  return top ? <Pages route={top} /> : null;
}

it('signed in, the leaderboard shows the server’s rows, ties sharing a rank, even with nothing on this device', async () => {
  await archive.ready;
  renderKt(<Host />, null);
  expect(await screen.findByRole('button', { name: '#1, Zoya, 900' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '#1, Ishan, 900' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '#3, Tara, 400' })).toBeInTheDocument();
  expect(screen.getByText('Every synced game, from the server.')).toBeInTheDocument();
});
