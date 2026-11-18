import { render, screen, within } from '@testing-library/react';
import { kitGame } from '@/games/spades/domain/__fixtures__/kit';
import { pidOf } from '@/people/pid';
import { HandPops } from './HandPops';

vi.mock('framer-motion', async (orig) => ({
  ...(await orig<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

/** Riya and Dev take all 13: a Boston for both, and Arjun and Meera are set. */
const game = kitGame([{ bids: [3, 4, 3, 4], teamA: 13 }]);

describe('a hand’s moments pop', () => {
  it('as one card per achievement, partners sharing it, big ones first', async () => {
    const names = new Map(game.players.map((p) => [pidOf(p), p.name]));
    render(<HandPops game={game} index={0} nameOf={(id) => names.get(id) ?? ''} />);
    const pop = await screen.findByRole('status');
    expect(await within(pop).findByText('Riya & Dev · Boston')).toBeInTheDocument();
    const cards = within(pop)
      .getAllByText(/ · /)
      .map((x) => x.textContent);
    expect(cards).toEqual(['Riya & Dev · Boston', 'Riya & Dev · Set Them']);
  });
});
