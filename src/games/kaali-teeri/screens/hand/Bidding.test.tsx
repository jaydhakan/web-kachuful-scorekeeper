import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { curHand } from '@/games/kaali-teeri/state/select';
import Bidding from './Bidding';
import { renderKt } from '@/games/kaali-teeri/test/render';
import { testGame } from '@/games/kaali-teeri/test/handGame';

const hand = (r: ReturnType<typeof renderKt>) => curHand(r.state().game!);

describe('Bidding, quick mode (the default)', () => {
  it('records the winner and the amount, which starts at the minimum and moves on the step', async () => {
    const r = renderKt(<Bidding />, testGame(5));
    expect(screen.getByRole('switch', { name: /quick mode/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const amount = screen.getByRole('spinbutton', { name: 'Winning bid' });
    expect(amount).toHaveAttribute('aria-valuenow', '150');
    // Nobody picked yet: no confirm.
    expect(screen.getByRole('button', { name: 'Tap the seat that won the bid' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /Riya/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Up 25' }));
    await userEvent.click(screen.getByRole('button', { name: 'Up 5' }));
    amount.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(amount).toHaveAttribute('aria-valuenow', '175');
    await userEvent.click(screen.getByRole('button', { name: 'Riya · 175' }));
    expect(hand(r)).toMatchObject({ phase: 'calling', bidder: 'p1', bid: 175 });
  });

  it('holds the amount between the minimum and the whole deck', async () => {
    renderKt(<Bidding />, testGame(8));
    const amount = screen.getByRole('spinbutton', { name: 'Winning bid' });
    expect(amount).toHaveAttribute('aria-valuenow', '350');
    expect(screen.getByRole('button', { name: 'Down 5' })).toBeDisabled();
    amount.focus();
    await userEvent.keyboard('{End}');
    expect(amount).toHaveAttribute('aria-valuenow', '500');
    expect(screen.getByRole('button', { name: 'Up 25' })).toBeDisabled();
  });

  it('switches to the full auction and remembers it on this device', async () => {
    const r = renderKt(<Bidding />, testGame(5));
    await userEvent.click(screen.getByRole('switch', { name: /quick mode/i }));
    expect(hand(r).mode).toBe('auction');
    expect(r.state().prefs.quick).toBe(false);
    expect(screen.getByRole('button', { name: 'Pass' })).toBeInTheDocument();
  });
});

describe('Bidding, full auction', () => {
  it('takes bids and passes in turn, from the player after the dealer, until everyone else passes', async () => {
    const r = renderKt(<Bidding />, testGame(4, { mode: 'auction' }));
    // Seat 1 (Riya) speaks first; the pad starts at the minimum.
    expect(screen.getByRole('spinbutton', { name: 'Bid for Riya' })).toHaveAttribute(
      'aria-valuenow',
      '150',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Bid 150' }));
    // Kabir must go higher: the pad's floor moves up a step.
    expect(screen.getByRole('spinbutton', { name: 'Bid for Kabir' })).toHaveAttribute(
      'aria-valuenow',
      '155',
    );
    expect(screen.getByRole('button', { name: 'Down 5' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Up 10' }));
    await userEvent.click(screen.getByRole('button', { name: 'Bid 165' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pass' })); // Meera
    await userEvent.click(screen.getByRole('button', { name: 'Pass' })); // Aarav
    expect(screen.getByText('Riya', { selector: 'span.disp' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Pass' })); // Riya
    expect(hand(r)).toMatchObject({ phase: 'calling', bidder: 'p2', bid: 165 });
  });

  it('offers only "Take it at 150" to the first speaker when everyone passed with no bid', async () => {
    const calls = ['p1', 'p2', 'p3', 'p0'].map((playerId) => ({ playerId, pass: true as const }));
    const r = renderKt(<Bidding />, testGame(4, { mode: 'auction', calls }));
    expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull();
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(
      screen.getByText('Everyone passed with no bid, so Riya takes it at 150.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Take it at 150' }));
    expect(hand(r)).toMatchObject({ phase: 'calling', bidder: 'p1', bid: 150 });
  });

  it('leaves only Pass once the whole deck is bid', () => {
    const calls = [{ playerId: 'p1', bid: 250 }];
    renderKt(<Bidding />, testGame(4, { mode: 'auction', calls }));
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.getByRole('button', { name: 'Pass' })).toBeEnabled();
  });
});
