import { act, render } from '@testing-library/react';
import { Seat, type SeatProps } from './Seat';

const props: SeatProps = {
  seat: 1,
  face: { name: 'Bo', emoji: '🙂', color: '#000' } as SeatProps['face'],
  name: 'Bo',
  me: false,
  pill: '–',
  pillNil: false,
  took: 0,
  aria: 'Bo',
  cardsLeft: 13,
  dealer: false,
  turn: false,
  away: false,
  nil: 'none',
  timer: null,
  invited: false,
  bubble: null,
};
const count = (el: HTMLElement) => el.querySelector('[data-cards]')?.textContent;

describe("a seat's card count", () => {
  afterEach(() => vi.useRealTimers());

  it('climbs from 0 to 13 as the deal lands its cards, then follows the hand', () => {
    vi.useFakeTimers();
    const delays = Array.from({ length: 13 }, (_, j) => j * 100);
    const { container, rerender } = render(
      <Seat {...props} deal={{ key: 1, delays, flight: 50 }} />,
    );
    expect(count(container)).toBe('0');
    act(() => void vi.advanceTimersByTime(560));
    expect(count(container)).toBe('6');
    act(() => void vi.advanceTimersByTime(1000));
    expect(count(container)).toBe('13');
    rerender(<Seat {...props} cardsLeft={12} deal={null} />);
    expect(count(container)).toBe('12');
  });
});
