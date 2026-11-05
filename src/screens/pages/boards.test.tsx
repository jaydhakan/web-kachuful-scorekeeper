import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/state/store';
import type { BoardRow } from '@/domain';
import { DeltaIntro } from '@/components/ui/Stats';
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

describe('rank movement arrows', () => {
  it('spring in on the first list of a visit, and sit still after a filter change', () => {
    const intro = { done: false };
    const list = (k: string) => (
      <AppProvider>
        <DeltaIntro.Provider value={intro}>
          <BoardList
            key={k}
            metric="points"
            data={{ minRounds: 10, facts: null, rows: [{ ...row('a', 1), rankDelta: 2 }] }}
          />
        </DeltaIntro.Provider>
      </AppProvider>
    );
    const { rerender } = render(list('month'));
    expect(screen.getByLabelText(/up 2/i).style.opacity).toBe('0');
    rerender(list('all'));
    expect(screen.getByLabelText(/up 2/i).style.opacity).not.toBe('0');
  });
});
