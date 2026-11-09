import { render, screen, within } from '@testing-library/react';
import { AppProvider } from '@/games/kachuful/state/store';
import { archive, archiveGame } from '@/state/archive';
import { ensurePlayer } from '@/state/registry';
import { kitGame, rows } from '@/games/kachuful/domain/__fixtures__/kit';
import { LevelUps } from './AchievementReel';

const H = 3600e3;

async function tenGames() {
  await archive.ready;
  const names = ['Asha', 'Bo', 'Cy'];
  const ids = names.map((n) => ensurePlayer({ name: n, emoji: '🙂', color: 'c' }).id);
  const start = Date.now() - 20 * H;
  const games = Array.from({ length: 10 }, (_, k) =>
    kitGame({
      id: 'lv' + k,
      players: ids,
      names,
      start: start + k * H,
      rounds: rows(3, 6, (i) => (i % 3 === 2 ? [1] : [0, 2])),
      finished: true,
    }),
  );
  games.forEach((g) => archiveGame(g));
  return games;
}

describe('level up on the winner screen', () => {
  it('shows the levels this game added, popping in after the ones held before', async () => {
    const games = await tenGames();
    render(
      <AppProvider>
        <LevelUps g={games[9]} heading="" />
      </AppProvider>,
    );
    const list = await screen.findByRole('region', { name: 'Level up' });
    const asha = within(list).getByText('Asha · Games played').closest('li')!;
    expect(within(asha).getByRole('img', { name: 'Level 0 to 1 of 5' })).toBeInTheDocument();
    // Nothing else levelled up in a game like the nine before it.
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('shows nothing for a game that added no level', async () => {
    const games = await tenGames();
    render(
      <AppProvider>
        <LevelUps g={games[5]} heading="" />
      </AppProvider>,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('region', { name: 'Level up' })).not.toBeInTheDocument();
  });
});
