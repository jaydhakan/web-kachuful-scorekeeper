import { act, fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import type { Seat } from '@/people';
import { useSeatDrag } from './useSeatDrag';

const seat = (name: string): Seat => ({ name, emoji: '🙂', color: '#123456' }) as Seat;

function Box({
  onSwap,
  onTap,
}: {
  onSwap: (a: number, b: number) => void;
  onTap: (k: number) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const d = useSeatDrag(wrap, [seat('A'), seat('B'), null], onSwap);
  return (
    <div ref={wrap} {...d.handlers}>
      {[0, 1, 2].map((k) => (
        <button key={k} data-seat={k} onClick={() => !d.justDragged() && onTap(k)}>
          {k}
        </button>
      ))}
      {d.ghost}
    </div>
  );
}

describe('useSeatDrag', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('hold then drop on another seat swaps them; the click after the drop is not a tap', () => {
    const onSwap = vi.fn(),
      onTap = vi.fn();
    const r = render(<Box onSwap={onSwap} onTap={onTap} />);
    const [a, b] = r.getAllByRole('button');
    fireEvent.pointerDown(a, { clientX: 0, clientY: 0 });
    act(() => void vi.advanceTimersByTime(400));
    fireEvent.pointerMove(a, { clientX: 50, clientY: 0 });
    document.elementFromPoint = () => b;
    fireEvent.pointerUp(a, { clientX: 50, clientY: 0 });
    expect(onSwap).toHaveBeenCalledWith(0, 1);
    fireEvent.click(b);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('a quick tap or a wandering finger never drags; an empty seat does not start one', () => {
    const onSwap = vi.fn(),
      onTap = vi.fn();
    const r = render(<Box onSwap={onSwap} onTap={onTap} />);
    const [a, , empty] = r.getAllByRole('button');
    fireEvent.pointerDown(a, { clientX: 0, clientY: 0 });
    fireEvent.pointerUp(a, { clientX: 0, clientY: 0 });
    fireEvent.click(a);
    expect(onTap).toHaveBeenCalledWith(0);
    fireEvent.pointerDown(a, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(a, { clientX: 30, clientY: 0 });
    act(() => void vi.advanceTimersByTime(400));
    fireEvent.pointerUp(a, { clientX: 30, clientY: 0 });
    fireEvent.pointerDown(empty, { clientX: 0, clientY: 0 });
    act(() => void vi.advanceTimersByTime(400));
    fireEvent.pointerUp(empty, { clientX: 0, clientY: 0 });
    expect(onSwap).not.toHaveBeenCalled();
  });
});
