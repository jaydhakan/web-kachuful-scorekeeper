import { render, screen } from '@testing-library/react';
import { AppProvider } from '@/games/kachuful/state/store';
import { dayLabel, timeLabel } from '@/lib/dates';
import { ep } from '@/sync/endpoints';
import type { NightRow } from '@/sync/types';
import { YourNights } from './YourNights';

const at = (y: number, mo: number, d: number, h: number) => new Date(y, mo, d, h).getTime();
const row = (id: string, startedAt: number): NightRow => ({
  id,
  closed: true,
  startedAt,
  endedAt: startedAt + 3600e3,
  players: [],
  games: 1,
  winner: null,
});

describe('Your nights', () => {
  afterEach(() => vi.restoreAllMocks());

  it('tells two nights of the same day apart by their start time, and leaves a lone night as its day', async () => {
    const afternoon = at(2025, 2, 3, 15);
    const late = at(2025, 2, 3, 21);
    vi.spyOn(ep, 'nights').mockResolvedValue({
      items: [row('n3', late), row('n2', afternoon), row('n1', at(2025, 2, 1, 20))],
      nextCursor: null,
    });
    render(
      <AppProvider>
        <YourNights playerId="p1" titled />
      </AppProvider>,
    );
    const rows = await screen.findAllByRole('button', { name: /Open the night$/ });
    expect(rows.map((r) => r.getAttribute('aria-label')!.split(': ')[0])).toEqual([
      `${dayLabel(late)} ${timeLabel(late)}`,
      `${dayLabel(afternoon)} ${timeLabel(afternoon)}`,
      dayLabel(at(2025, 2, 1, 20)),
    ]);
  });
});
