import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
// The shell is a lazy chunk; loaded up front so transforming it can't outlast a findBy.
import '@/games/kachuful/components/PhoneShell';

const btn = (name: string | RegExp) => screen.findByRole('button', { name });
const table = (uid: 'bid' | 'play') => document.querySelector(`[data-table="${uid}"]`);

async function deal(u: ReturnType<typeof userEvent.setup>) {
  await u.click(await btn('New Game'));
  await u.click(await btn('3 players'));
  await u.click(await btn('Next'));
  await u.click(await btn('Add player'));
  for (const [i, n] of ['Asha', 'Bo', 'Cy'].entries()) {
    await u.type(await screen.findByLabelText('Player name'), n + '{Enter}');
    await screen.findByText(`${i + 1} of 3 seated`);
  }
  await u.click(await btn('Next'));
  await u.click(await btn('Deal!'));
  await u.click(await btn('Skip the deal animation'));
}

describe('bidding ↔ playing on the phone', () => {
  it('keeps one table element through bidding, playing and back to bidding', async () => {
    const u = userEvent.setup({ pointerEventsCheck: 0 });
    render(<App />);
    await deal(u);
    await btn('Bid 1');
    const first = table('bid');
    expect(first).not.toBeNull();
    const frame = first!.closest('.glass');

    // Bo and Cy bid 1 and Asha, the dealer, 0 (1 would make the bids equal the 3 cards).
    await u.click(await btn('Bid 1'));
    await u.click(await btn('Bid 1'));
    await u.click(await btn('Bid 0'));
    expect(table('bid')).toBe(first);

    await u.click(await btn('Start playing'));
    await btn('Enter results');
    // Only the round's own table counts: the setup screen and the deal may still be on their way out.
    expect(document.querySelectorAll('[data-table="bid"], [data-table="play"]')).toHaveLength(1);
    expect(table('play')).toBe(first);
    expect(first!.closest('.glass')).toBe(frame);
    expect(screen.getByText('Leads the first trick')).toBeInTheDocument();
    // The dock keeps its place (so the table keeps its size) but is out of reach and out of the accessibility tree.
    expect(screen.queryByRole('button', { name: /^Bid \d/ })).toBeNull();
    expect(document.querySelector('[data-bid-dock]')).toHaveAttribute('aria-hidden', 'true');
    expect(document.querySelector('[data-bid-dock]')).toHaveAttribute('inert');
    // No seat is a button while playing.
    expect(first!.querySelector('[data-seat][role="button"]')).toBeNull();

    await u.click(screen.getByRole('button', { name: 'Edit bids' }));
    await btn('Bid 1');
    expect(table('bid')).toBe(first);
    expect(document.querySelector('[data-bid-dock]')).not.toHaveAttribute('aria-hidden');
    expect(document.querySelector('[data-bid-dock]')).not.toHaveAttribute('inert');
    expect(await btn('Start playing')).toBeEnabled();
  });
});
