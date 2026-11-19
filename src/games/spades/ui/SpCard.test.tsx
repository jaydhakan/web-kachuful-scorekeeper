import { render } from '@testing-library/react';
import { SpCard } from './SpCard';

describe('a Spades card face', () => {
  it('is our plain face with no theme art over it, in every theme', () => {
    const { container } = render(<SpCard card={{ rank: 'A', suit: 'spades' }} />);
    expect(container.querySelector('.card-standin, .card-photo')).toBeNull();
    expect(container.querySelector('.card-flat')?.className).toContain('bg-sp-card-face');
  });

  it('inks spades and clubs dark and hearts and diamonds red', () => {
    const ink = (suit: 'spades' | 'hearts' | 'diamonds' | 'clubs') =>
      render(<SpCard card={{ rank: '7', suit }} />).container.querySelector('.card-flat')
        ?.className ?? '';
    expect(ink('spades')).toContain('text-sp-card-ink');
    expect(ink('clubs')).toContain('text-sp-card-ink');
    expect(ink('hearts')).toContain('text-sp-card-red');
    expect(ink('diamonds')).toContain('text-sp-card-red');
  });
});
