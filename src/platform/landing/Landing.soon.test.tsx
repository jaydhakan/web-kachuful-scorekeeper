import { render, screen, within } from '@testing-library/react';
import Landing from './Landing';

// A game listed before it is built (Ishaara was, until it went live).
vi.mock('../catalog', async (orig) => {
  const m = await orig<typeof import('../catalog')>();
  return {
    ...m,
    GAMES: m.GAMES.map((g) => (g.id === 'ishaara' ? { ...g, status: 'soon' as const } : g)),
  };
});

describe('Landing, a game coming soon', () => {
  it('is text, not a control', () => {
    render(<Landing />);
    const card = screen.getByRole('article', { name: 'Ishaara, coming soon' });
    expect(within(card).getByText('Coming soon')).toBeInTheDocument();
    expect(within(card).queryByRole('link')).toBeNull();
    expect(within(card).queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link', { name: /Ishaara/ })).toBeNull();
  });
});
