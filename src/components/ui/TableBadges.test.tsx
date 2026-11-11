import { render } from '@testing-library/react';
import { Table } from './Table';

const seat = (k: number) => ({ id: 'p' + k, name: 'P' + k, emoji: '🙂', color: '#FF8A65' });
const players = (n: number) => Array.from({ length: n }, (_, k) => seat(k));
const badge = { icon: <i />, label: 'Bidder', style: {} };

describe('Table seat badges', () => {
  it('draws nothing extra without badges (Kachuful passes none)', () => {
    const { container } = render(<Table uid="t" players={players(5)} noSeatAnim />);
    expect(container.querySelectorAll('[data-seat-chip]')).toHaveLength(0);
  });

  it('shows the word under a named seat, and keeps it for assistive tech on a crowded table', () => {
    const named = render(<Table uid="a" players={players(5)} badges={{ p1: badge }} noSeatAnim />);
    const chip = named.container.querySelector('[data-seat="1"] [data-seat-chip]')!;
    expect(chip).toHaveTextContent('Bidder');
    expect(chip.querySelector('.sr-only')).toBeNull();
    const crowded = render(
      <Table uid="b" players={players(10)} badges={{ p1: badge }} noSeatAnim />,
    );
    const small = crowded.container.querySelector('[data-seat="1"] [data-seat-chip]')!;
    expect(small.querySelector('.sr-only')).toHaveTextContent('Bidder');
  });
});
