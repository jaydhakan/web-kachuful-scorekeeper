import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { curHand } from '@/games/kaali-teeri/state/select';
import { useKt } from '@/games/kaali-teeri/state/store';
import CardPicker from '@/games/kaali-teeri/sheets/CardPicker';
import Call from './Call';
import { renderKt } from '@/games/kaali-teeri/test/render';
import { testGame } from '@/games/kaali-teeri/test/handGame';

const calling = { phase: 'calling' as const, bidder: 'p1', bid: 185 };
const hand = (r: ReturnType<typeof renderKt>) => curHand(r.state().game!);

describe('Call', () => {
  it('picks trump, then the partner cards, and confirms', async () => {
    const r = renderKt(<Call />, testGame(6, calling));
    expect(screen.getByText('Riya, pick trump')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick a trump suit' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Hearts' }));
    expect(hand(r).trump).toBe('hearts');
    await userEvent.click(screen.getByRole('button', { name: 'Next: call 2 partner cards' }));

    expect(screen.getByText('Riya leads')).toBeInTheDocument();
    // Six players: every 2 is out of the deck.
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByRole('status')).toHaveTextContent('Every 2 is taken out or called');

    await userEvent.click(screen.getByRole('button', { name: 'A' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hearts' }));
    expect(hand(r).called).toEqual([{ rank: 'A', suit: 'hearts' }]);
    // A♥ is called: with the ace picked again, hearts is refused with a reason.
    await userEvent.click(screen.getByRole('button', { name: 'A' }));
    expect(screen.getByRole('button', { name: 'Hearts' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Hearts' }));
    expect(screen.getByRole('status')).toHaveTextContent('A♥ is already called');
    await userEvent.click(screen.getByRole('button', { name: 'Spades' }));

    await userEvent.click(screen.getByRole('button', { name: 'Call A♥ and A♠' }));
    expect(hand(r).phase).toBe('playing');
  });

  it('asks which copy with two decks, and offers "The other one"', async () => {
    const r = renderKt(<Call />, testGame(8, { ...calling, trump: 'clubs' }));
    await userEvent.click(screen.getByRole('button', { name: '10' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clubs' }));
    // Not added until the copy is said.
    expect(hand(r).called).toEqual([]);
    await userEvent.click(screen.getByRole('button', { name: 'The other one' }));
    expect(hand(r).called).toEqual([{ rank: '10', suit: 'clubs', copy: 'other' }]);
    // "The other one" can't be combined with another call of the same card.
    await userEvent.click(screen.getByRole('button', { name: '10' }));
    expect(screen.getByRole('button', { name: 'Clubs' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('skips the copy for a card with one copy left in play', async () => {
    // Nine players: both 2♣, both 2♦ and one 2♥ are out.
    const r = renderKt(<Call />, testGame(9, { ...calling, trump: 'spades' }));
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByRole('button', { name: 'Clubs' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Hearts' }));
    expect(hand(r).called).toEqual([{ rank: '2', suit: 'hearts' }]);
  });

  it('removes a called card', async () => {
    const called = [{ rank: 'K' as const, suit: 'spades' as const }];
    const r = renderKt(
      <Call />,
      testGame(6, { ...calling, trump: 'hearts', called, playedBy: [null] }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove K♠' }));
    expect(hand(r).called).toEqual([]);
  });

  it('changes a called card in the picker sheet: a new copy keeps its place, a new card replaces it', async () => {
    function Host() {
      const { state } = useKt();
      return state.sheet?.type === 'card' ? <CardPicker key={String(state.sheet.i)} /> : null;
    }
    const called = [
      { rank: 'K' as const, suit: 'spades' as const, copy: 1 as const },
      { rank: 'A' as const, suit: 'hearts' as const, copy: 2 as const },
    ];
    const g = testGame(8, { ...calling, trump: 'hearts', called, playedBy: [null, null] });
    const r = renderKt(
      <>
        <Call />
        <Host />
      </>,
      g,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Change K♠' }));
    await userEvent.click(screen.getAllByRole('button', { name: '2nd played' }).at(-1)!);
    expect(hand(r).called[0]).toEqual({ rank: 'K', suit: 'spades', copy: 2 });
    expect(r.state().sheet).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Change A♥' }));
    await userEvent.click(screen.getAllByRole('button', { name: 'Q' }).at(-1)!);
    await userEvent.click(screen.getAllByRole('button', { name: '1st played' }).at(-1)!);
    expect(hand(r).called).toEqual([
      { rank: 'K', suit: 'spades', copy: 2 },
      { rank: 'Q', suit: 'hearts', copy: 1 },
    ]);
  });
});
