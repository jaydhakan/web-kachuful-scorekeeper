import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TeamBar, type TeamLine } from './TeamBar';

const line = (over: Partial<TeamLine> = {}): TeamLine => ({
  team: 'a',
  name: 'You & Dev',
  tag: 'Your team',
  score: 0,
  contract: null,
  partial: [null, null],
  doubleNil: false,
  took: 0,
  bags: 0,
  bursts: 0,
  made: false,
  set: null,
  mine: true,
  ...over,
});

describe('the team bar while bidding', () => {
  it('says "bidding…" until one partner has bid', () => {
    render(<TeamBar lines={[line()]} />);
    expect(screen.getByText('bidding…')).toBeInTheDocument();
  });

  it('shows the bids so far: "3 + …", then "Nil + 4" once both are in', () => {
    const { rerender } = render(<TeamBar lines={[line({ partial: [3, null] })]} />);
    expect(screen.getByText('3 + …')).toBeInTheDocument();
    rerender(<TeamBar lines={[line({ partial: [null, 0] })]} />);
    expect(screen.getByText('… + Nil')).toBeInTheDocument();
    rerender(<TeamBar lines={[line({ contract: 4, partial: [0, 4] })]} />);
    expect(screen.queryByText(/…/)).not.toBeInTheDocument();
    expect(screen.getByText('0/4')).toBeInTheDocument();
  });
});
