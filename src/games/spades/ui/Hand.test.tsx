import { fireEvent, render } from '@testing-library/react';
import { card, cards } from '@/games/spades/domain/__fixtures__/kit';
import { Hand, type HandProps } from './Hand';

const props = (over: Partial<HandProps> = {}): HandProps => ({
  cards: cards('2h 5h 9h Kh As'),
  count: 5,
  reveal: true,
  handKey: 'h1',
  sort: 'up',
  playable: true,
  myTurn: true,
  trick: [],
  broken: true,
  onPlay: () => {},
  onBlocked: () => {},
  width: 390,
  ...over,
});
const button = (c: HTMLElement, id: string) =>
  c.querySelector<HTMLButtonElement>(`button[data-card-id="${id}"]`)!;
const z = (el: HTMLElement) => Number(el.style.zIndex);

describe('picking a card in the hand', () => {
  it('lifts the card you tap and moves the lift when you tap another, without playing', () => {
    const onPlay = vi.fn();
    const { container } = render(<Hand {...props({ onPlay })} />);
    const [a, b] = ['5h', '9h'].map((id) => button(container, id));
    fireEvent.click(a);
    expect(a).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(b);
    expect(b).toHaveAttribute('aria-pressed', 'true');
    expect(a).toHaveAttribute('aria-pressed', 'false');
    expect(onPlay).not.toHaveBeenCalled();
    fireEvent.click(b);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay.mock.calls[0][0]).toEqual(card('9h'));
  });

  it('keeps a lifted card in its place in the stack, so its right-hand neighbours stay tappable', () => {
    const { container } = render(<Hand {...props()} />);
    const all = [...container.querySelectorAll<HTMLButtonElement>('button[data-card-id]')];
    fireEvent.click(button(container, '5h'));
    expect(all.map(z)).toEqual(all.map((_, i) => i + 1));
  });
});
