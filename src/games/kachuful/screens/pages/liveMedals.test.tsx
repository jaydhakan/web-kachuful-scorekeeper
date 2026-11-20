import { render, screen } from '@testing-library/react';
import { kitGame } from '@/games/kachuful/domain/__fixtures__/kit';
import { MedalsValue, NO_MEDALS } from '@/games/kachuful/state/medals';
import { LiveStandings } from './LivePage';

describe('the live standings', () => {
  const g = kitGame({
    id: 'lv',
    players: ['R', 'D', 'A'],
    names: ['Riya', 'Dev', 'Asha'],
    rounds: [{ made: [true, false, true] }],
    start: Date.now() - 600e3,
  });

  it("carry the table's medals and the Kursi's chair for a spectator", () => {
    const riya = g.players[0].id,
      dev = g.players[1].id;
    const value = {
      ...NO_MEDALS,
      held: new Map([[riya, { medal: 1 as const, defending: false }]]),
      kursi: { seats: [dev], defences: 2 },
    };
    const { container } = render(
      <MedalsValue value={value}>
        <LiveStandings g={g} />
      </MedalsValue>,
    );
    expect(container.querySelector('.medal-1')).toHaveTextContent('Riya');
    const devRow = screen.getByText('Dev').closest('li')!;
    expect(devRow.querySelector('[role="img"]')).toBeInTheDocument();
  });

  it('are plain names with no medals scope', () => {
    const { container } = render(<LiveStandings g={g} />);
    expect(container.querySelector('[class*="medal-"]')).toBeNull();
    expect(screen.getByText('Riya')).toBeInTheDocument();
  });
});
