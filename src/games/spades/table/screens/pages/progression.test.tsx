import { render, screen, within } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'framer-motion';
import { kitGame } from '@/games/spades/domain/__fixtures__/kit';
import { pidOf } from '@/people/pid';
import { archive } from '@/state/archive';
import { archiveSpGame } from '@/games/spades/table/state/archive';
import { SpTableProvider } from '@/games/spades/table/state/store';
import type { SpRoute } from '@/games/spades/table/state/types';
import Pages from './Pages';

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

const now = Date.now();
/** Riya and Dev take all 13 and win, today: a Boston, Set Them, the Winner and a Boston of the Day. */
const game = kitGame([{ bids: [3, 4, 3, 4], teamA: 13 }], {
  id: 'pp1',
  syncId: 'progression-page-1',
  createdAt: now - 3600e3,
  updatedAt: now - 60e3,
  status: 'finished',
  result: { winner: 'a', endedBy: 'end' },
  finishedAt: now - 60e3,
});
game.hands[0].doneAt = now - 60e3;
const riya = pidOf(game.players[0]);

const open = async (route: SpRoute | null, page: 'awards' | null = null) => {
  await archive.ready;
  archiveSpGame(game);
  return render(
    <LazyMotion features={domAnimation}>
      <SpTableProvider>
        <Pages page={page} route={route} />
      </SpTableProvider>
    </LazyMotion>,
  );
};

describe('Spades progression pages, signed out', () => {
  it('Awards shows today’s awards from this phone’s games, and links to Achievements', async () => {
    await open(null, 'awards');
    expect((await screen.findAllByText('Boston of the Day')).length).toBe(2);
    expect(screen.getAllByText('Riya').length).toBeGreaterThan(0);
    // Signed out there is no feed to link to.
    expect(screen.queryByRole('button', { name: /Activity/ })).toBeNull();
  });

  it('Achievements lists a player’s earned ones and how to earn the rest', async () => {
    await open({ page: 'achievements', id: riya });
    expect(await screen.findByRole('heading', { name: 'Hand moments' })).toBeInTheDocument();
    expect(screen.getAllByText('Boston').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Your 2♠ wins a trick/).length).toBeGreaterThan(0);
  });

  it('the player page shows what they earned and links to the whole list', async () => {
    await open({ page: 'player', id: riya });
    const section = (await screen.findByRole('heading', { name: 'Achievements' })).closest(
      'section',
    )!;
    expect(within(section).getByText('Boston')).toBeInTheDocument();
    expect(within(section).getByText(/^\d+ of 59 earned$/)).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: /See all of Riya/ })).toBeInTheDocument();
  });
});
