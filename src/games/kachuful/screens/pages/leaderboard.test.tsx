import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '@/games/kachuful/state/store';
import { kitGame, rows } from '@/games/kachuful/domain/__fixtures__/kit';
import { archive, archiveGame } from '@/state/archive';
import { ensurePlayer } from '@/state/registry';
import type { BoardRow } from '@/games/kachuful/domain';
import { DeltaIntro } from '@/components/ui/Stats';
import { BoardList, LeaderboardPage } from './LeaderboardPage';

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

describe('re-sorting a board', () => {
  const board = (metric: 'points' | 'wins', order: string[]) => (
    <AppProvider>
      <BoardList
        metric={metric}
        data={{ minRounds: 10, facts: null, rows: order.map((id, i) => row(id, i + 1)) }}
      />
    </AppProvider>
  );

  it("moves each player's row to its new rank instead of building the list again", () => {
    const { rerender } = render(board('points', ['a', 'b', 'c']));
    const before = screen.getAllByRole('listitem');
    rerender(board('wins', ['c', 'a', 'b']));
    const after = screen.getAllByRole('listitem');
    expect(after).toHaveLength(3);
    // Same nodes, new order: a was first and is now second, c came from last to first.
    expect(after[0]).toBe(before[2]);
    expect(after[1]).toBe(before[0]);
    expect(after[2]).toBe(before[1]);
  });

  it('fades out a row whose player left the board, and keeps the others', async () => {
    const { rerender } = render(board('points', ['a', 'b', 'c']));
    const before = screen.getAllByRole('listitem');
    rerender(board('points', ['a', 'c']));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    expect(screen.getAllByRole('listitem')).toEqual([before[0], before[2]]);
  });

  it('keeps the rows on the page when the sort changes', async () => {
    await archive.ready;
    const names = ['Asha', 'Bo', 'Cy'];
    const ids = names.map((n) => ensurePlayer({ name: n, emoji: '🙂', color: 'c' }).id);
    archiveGame(
      kitGame({
        id: 'h1',
        players: ids,
        names,
        start: Date.now() - 3600e3,
        rounds: rows(3, 12, [0]),
        finished: true,
      }),
    );
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    const sortBy = async (name: string) => {
      await u.click(screen.getByRole('button', { name: /^Sort by/ }));
      await u.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) }));
    };
    render(
      <AppProvider>
        <LeaderboardPage />
      </AppProvider>,
    );
    // Totals rank everyone, so both sorts keep Asha in the same (ranked) list.
    await sortBy('Points(?! per)');
    const row = () => screen.getByRole('button', { name: /Asha/ }).closest('li');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^#\d Asha/ })).toBeInTheDocument(),
    );
    const before = row();
    await sortBy('Rounds');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Sort by.*Rounds/ })).toBeInTheDocument(),
    );
    expect(row()).toBe(before);
  });
});
