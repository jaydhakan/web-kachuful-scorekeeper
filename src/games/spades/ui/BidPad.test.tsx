import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { play as s } from '@/games/spades/strings/play';
import { BidPad, type BidOther } from './BidPad';

const face = { emoji: '🦊', color: '#e8a87c' };
const others: BidOther[] = [
  { seat: 1, name: 'Zed', face, bid: 2, blind: false, partner: false },
  { seat: 2, name: 'Taha the Great', face, bid: 3, blind: false, partner: true },
  { seat: 3, name: 'Ria', face, bid: null, blind: false, partner: false },
];

const show = (list: BidOther[]) =>
  render(
    <BidPad
      allowed={[0, 1, 2, 3]}
      why={() => null}
      info="Taha 3 + you"
      others={list}
      onBid={vi.fn()}
      onBlocked={vi.fn()}
    />,
  );

describe('the bid pad’s bids so far', () => {
  it('lists the other three players with their bids, "…" for one yet to bid', () => {
    show(others);
    const items = within(screen.getByRole('list', { name: s.bid.othersLabel })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Zed');
    expect(items[0]).toHaveTextContent('2');
    expect(items[2]).toHaveTextContent(s.bid.chipBid(null, false));
  });

  it('shortens a long name and tells a screen reader who the partner is', () => {
    show(others);
    const partner = screen.getByText(s.bid.chipAria('Taha the Great', 3, false, true));
    expect(partner.closest('li')).toHaveTextContent('Taha th…');
    expect(partner.textContent).toContain('your partner');
  });

  it('writes Nil and Blind Nil', () => {
    show([
      { ...others[0], bid: 0, blind: false },
      { ...others[1], bid: 0, blind: true },
      others[2],
    ]);
    expect(screen.getByRole('list', { name: s.bid.othersLabel })).toHaveTextContent('Nil');
    expect(screen.getByRole('list', { name: s.bid.othersLabel })).toHaveTextContent('Blind Nil');
  });
});
