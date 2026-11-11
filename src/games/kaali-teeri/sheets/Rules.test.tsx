import { screen, within } from '@testing-library/react';
import { archive } from '@/state/archive';
import { liveDemo, renderKt } from '@/games/kaali-teeri/test/render';
import Rules from './Rules';

describe('the rules sheet', () => {
  beforeEach(() => archive.ready);

  it("shows this game's settings and marks its row in the deal table", () => {
    renderKt(<Rules />, liveDemo());
    const set = screen.getByRole('region', { name: 'This game' });
    expect(set).toHaveTextContent('Players5');
    expect(set).toHaveTextContent('Minimum bid150');
    expect(set).toHaveTextContent('Partners1 called card');
    expect(set).toHaveTextContent('Game lengthEndless');
    const deal = screen.getAllByRole('table')[0];
    const rows = within(deal).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(7);
    const five = rows[1];
    expect(five).toHaveAttribute('aria-current', 'true');
    expect(five).toHaveTextContent('2♣2♦10');
    // Two decks: both copies of 2♣ and 2♦, and one 2♥.
    expect(rows[5]).toHaveTextContent('92♣ ×22♦ ×22♥11');
    expect(rows[0]).toHaveTextContent('4Nothing13');
  });

  it('works the scoring example from the game', () => {
    renderKt(<Rules />, liveDemo());
    expect(screen.getByText(/Bid/, { selector: 'p' })).toHaveTextContent(
      'Bid 180, one partner. The defenders take 60, so the team has 190: made.',
    );
  });

  it('without a game, gives both deck counts', () => {
    renderKt(<Rules />, null);
    expect(screen.queryByRole('region', { name: 'This game' })).toBeNull();
    expect(screen.getAllByText(/150 \/ 350/).length).toBeGreaterThan(0);
  });
});
