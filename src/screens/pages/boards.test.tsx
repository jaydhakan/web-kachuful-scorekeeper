import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/state/store';
import type { BoardRow } from '@/domain';
import { BoardList } from './BoardsPage';

const row = (playerId: string, rank: number): BoardRow => ({
  rank,
  qualified: true,
  playerId,
  value: 100 - rank,
  points: 100 - rank,
  games: 2,
  rounds: 20,
  wins: 1,
  accuracy: 0.5,
  longestHot: 2,
  rankDelta: null,
});

describe('the "You" row on a board', () => {
  it('draws its outline as a layer of its own, since .glass owns the card shadow', () => {
    render(
      <AppProvider>
        <BoardList
          metric="points"
          you="b"
          data={{ minRounds: 10, facts: null, rows: [row('a', 1), row('b', 2)] }}
        />
      </AppProvider>,
    );
    const [first, mine] = screen.getAllByRole('listitem');
    expect(mine.querySelector('.glass > [aria-hidden].absolute.inset-0')).not.toBeNull();
    expect(mine.className).toMatch(/sticky/);
    expect(first.querySelector('.glass > [aria-hidden].absolute.inset-0')).toBeNull();
  });
});
