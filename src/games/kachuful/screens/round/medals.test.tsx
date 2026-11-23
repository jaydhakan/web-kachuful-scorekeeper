import { render, screen, within } from '@testing-library/react';
import { pickIndex, type MedalRow } from '@/games/kachuful/domain';
import { kitGame } from '@/games/kachuful/domain/__fixtures__/kit';
import { MedalsValue, tableMedals } from '@/games/kachuful/state/medals';
import { AppProvider } from '@/games/kachuful/state/store';
import { poolFor } from '@/games/kachuful/strings/banter';
import { monthOf, monthRange } from '@/progression/zone';
import { Summary } from './Summary';

const MONTH = monthOf(Date.now());
const [from] = monthRange(MONTH);

/** A board row ranked on bid accuracy (`value`, 0–1), at 10 points a round. */
const row = (playerId: string, rank: number | null, value: number, rounds = 60): MedalRow => ({
  playerId,
  rank,
  qualified: rank != null,
  value,
  accuracy: value,
  points: 10 * rounds,
  rounds,
});

/** Riya (gold) is the only one of four to miss; Asha, 50 rounds with every bid made, qualifies on this game. */
function setup() {
  const g = kitGame({
    id: 'md',
    players: ['R', 'D', 'A', 'K'],
    names: ['Riya', 'Dev', 'Asha', 'Kabir'],
    rounds: [{ made: [false, true, true, true] }],
    start: from + 60e3,
  });
  g.rounds.pop();
  g.ui = { view: 'summary', bidIdx: 0 };
  // Asha has made all 50 of her bids: this game's round qualifies her, at the top.
  const base = {
    month: MONTH,
    minRounds: 50,
    rows: [row('R', 1, 0.9), row('D', 2, 0.85), row('K', 3, 0.8), row('A', null, 1, 50)],
    last: [],
  };
  const value = tableMedals(g, base);
  render(
    <AppProvider initial={{ game: g, screen: 'round', undo: [], corrupt: false }}>
      <MedalsValue value={value}>
        <Summary />
      </MedalsValue>
    </AppProvider>,
  );
  return g;
}

describe('the summary at a table with medallists', () => {
  it("says the round's line about the Badshah, in place of 'everyone but'", () => {
    const g = setup();
    const line = poolFor('soleMiss', 'gold');
    const want = line[pickIndex(`${g.syncId}:0`, line.length)]('Riya', '');
    expect(screen.getByText(want)).toBeInTheDocument();
    expect(screen.queryByText(/Everyone but/)).toBeNull();
  });

  it('draws the medallists in their metal, cracks the slipping Badshah and marks the chaser', () => {
    setup();
    const rows = within(screen.getByRole('region', { name: 'Standings' }));
    expect(rows.getByText('Riya').className).toContain('medal-1');
    expect(rows.getByText('Dev').className).toContain('medal-2');
    expect(rows.getByText('Riya').querySelector('.medal-crack')).not.toBeNull();
    expect(rows.getByText('Asha is on track to be Badshah')).toBeInTheDocument();
  });
});
