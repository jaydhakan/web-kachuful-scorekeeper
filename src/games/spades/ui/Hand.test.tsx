import { fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { card, cards } from '@/games/spades/domain/__fixtures__/kit';
import { Hand, type HandProps } from './Hand';

const props = (over: Partial<HandProps> = {}): Omit<HandProps, 'lifted' | 'onLift'> => ({
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
/** Holds the lifted card the way the table does. */
function Held(
  p: Omit<HandProps, 'lifted' | 'onLift'> & { onLiftChange?: (id: string | null) => void },
) {
  const [lifted, setLifted] = useState<string | null>(null);
  return (
    <Hand
      {...p}
      lifted={lifted}
      onLift={(id) => {
        setLifted(id);
        p.onLiftChange?.(id);
      }}
    />
  );
}
const button = (c: HTMLElement, id: string) =>
  c.querySelector<HTMLButtonElement>(`button[data-card-id="${id}"]`)!;
const z = (el: HTMLElement) => Number(el.style.zIndex);

describe('picking a card in the hand', () => {
  it('lifts the card you tap and moves the lift when you tap another, without playing', () => {
    const onPlay = vi.fn();
    const { container } = render(<Held {...props({ onPlay })} />);
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
    const { container } = render(<Held {...props()} />);
    const all = [...container.querySelectorAll<HTMLButtonElement>('button[data-card-id]')];
    fireEvent.click(button(container, '5h'));
    expect(all.map(z)).toEqual(all.map((_, i) => i + 1));
  });

  it('puts the card back with Escape, and with a tap on the empty part of the hand', () => {
    const { container } = render(<Held {...props()} />);
    const a = button(container, '5h');
    fireEvent.click(a);
    fireEvent.keyDown(a, { key: 'Escape' });
    expect(a).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(a);
    expect(a).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(container.querySelector('[data-hand]')!);
    expect(a).toHaveAttribute('aria-pressed', 'false');
  });

  it('tells the parent which card is lifted, and that nothing is once the card is played', () => {
    const lifts: (string | null)[] = [];
    const { container } = render(<Held {...props()} onLiftChange={(id) => lifts.push(id)} />);
    const a = button(container, '5h');
    fireEvent.click(a);
    fireEvent.click(a);
    expect(lifts).toEqual(['5h', null]);
  });
});
