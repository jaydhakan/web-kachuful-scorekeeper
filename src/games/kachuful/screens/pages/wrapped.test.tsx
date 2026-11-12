import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppProvider } from '@/games/kachuful/state/store';
import type { Wrapped } from '@/games/kachuful/domain';
import { archive } from '@/state/archive';
import { WrappedPage } from './WrappedPage';

const data = {
  year: 2026,
  playerId: 'x',
  totals: { rounds: 40, points: 320 },
  bestMonth: null,
  bestDay: null,
  favouriteTrump: null,
  nemesis: null,
  partner: null,
  biggestRound: null,
  longestRun: 4,
  achievements: 6,
  topDays: [],
  rank: { rank: 3, outOf: 9 },
} as unknown as Wrapped;

const show = async () => {
  await archive.ready;
  render(
    <AppProvider>
      <WrappedPage year={2026} data={data} />
    </AppProvider>,
  );
};
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
const card = () => screen.getByRole('button', { name: 'Tap for the next card' });

describe('Wrapped', () => {
  it('holds the last slide for a beat, then brings in the rank', async () => {
    await show();
    // Four slides: totals, streak, achievements, rank. Each one leaves before the next comes in.
    for (const kicker of ['Your best streak', 'Achievements earned', 'Your rank']) {
      next();
      await screen.findByText(kicker);
    }
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    // Held: the value is in place but unseen, and the rank has not started its climb from last place.
    const value = screen.getByText('/ 9').parentElement!;
    expect(value.style.opacity).toBe('0');
    expect(value).toHaveTextContent('#9');
    await waitFor(() => expect(value).toHaveTextContent('#3'), { timeout: 3000 });
  });

  it('shows the other slides without the beat, and still advances on a tap', async () => {
    await show();
    // No wrapper of its own: the value sits straight in the slide.
    expect(screen.getByText('points scored').parentElement).toHaveAttribute('aria-live');
    fireEvent.click(card());
    expect(await screen.findByText('Your best streak')).toBeInTheDocument();
  });
});
