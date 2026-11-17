import { render, screen, within } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'framer-motion';
import { kitGame, T0 } from '@/games/spades/domain/__fixtures__/kit';
import { pidOf } from '@/people/pid';
import { archive } from '@/state/archive';
import { archiveSpGame } from '@/games/spades/table/state/archive';
import { SpTableProvider } from '@/games/spades/table/state/store';
import Pages from './Pages';

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

/** Riya's team makes 6 while Arjun's is set; then Riya's Nil holds. Riya and Dev win. */
const game = kitGame(
  [
    { bids: [3, 4, 3, 3], teamA: 7 },
    { bids: [0, 4, 4, 3], teamA: 5, nil: [0, null, null, null] },
  ],
  {
    id: 'g1',
    syncId: 'player-page-1',
    status: 'finished',
    result: { winner: 'a', endedBy: 'end' },
    finishedAt: T0,
  },
);

describe("a player's page", () => {
  it('shows their stats and their partner', async () => {
    await archive.ready;
    archiveSpGame(game);
    const riya = pidOf(game.players[0]);
    render(
      <LazyMotion features={domAnimation}>
        <SpTableProvider>
          <Pages page={null} route={{ page: 'player', id: riya }} />
        </SpTableProvider>
      </LazyMotion>,
    );
    const stats = await screen.findByRole('heading', { name: 'Stats' });
    const grid = stats.closest('section')!;
    expect(within(grid).getByText('Win rate').nextSibling?.textContent).toBe('100%');
    expect(screen.getByText(game.players[2].name)).toBeInTheDocument();
  });
});
