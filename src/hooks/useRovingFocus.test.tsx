import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useRovingFocus } from './useRovingFocus';

function Group({
  count = 5,
  selected = -1,
  columns = 1,
  grid = false,
}: {
  count?: number;
  selected?: number;
  columns?: number | 'auto';
  grid?: boolean;
}) {
  const [sel, setSel] = useState(selected);
  const roving = useRovingFocus({
    selected: sel,
    columns,
    orientation: grid ? 'grid' : 'horizontal',
  });
  return (
    <>
      <button type="button">before</button>
      <div role="group" aria-label="opts" {...roving.group}>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={sel === i}
            onClick={() => setSel(i)}
            {...roving.item(i)}
          >
            {`o${i}`}
          </button>
        ))}
      </div>
      <button type="button">after</button>
    </>
  );
}

const opt = (i: number) => screen.getByRole('button', { name: `o${i}` });
const after = () => screen.getByRole('button', { name: 'after' });
const setup = () => userEvent.setup({ pointerEventsCheck: 0 });

describe('useRovingFocus', () => {
  it('has one tab stop: the first option when none is selected', () => {
    render(<Group />);
    expect([0, 1, 2, 3, 4].map((i) => opt(i).tabIndex)).toEqual([0, -1, -1, -1, -1]);
  });

  it('makes the selected option the tab stop, and Tab leaves the group in one step', async () => {
    const user = setup();
    render(<Group selected={2} />);
    await user.tab();
    await user.tab();
    expect(opt(2)).toHaveFocus();
    await user.tab();
    expect(after()).toHaveFocus();
    await user.tab({ shift: true });
    expect(opt(2)).toHaveFocus();
  });

  it('arrows move focus and wrap, without selecting; other keys are left alone', async () => {
    const user = setup();
    render(<Group />);
    await user.tab();
    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(opt(1)).toHaveFocus();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(opt(4)).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(opt(0)).toHaveFocus();
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
    await user.keyboard('{ArrowDown}{Home}{End}');
    expect(opt(0)).toHaveFocus();
  });

  it('Tab from a moved-to option goes to the next group, not to the selected one', async () => {
    const user = setup();
    render(<Group selected={4} />);
    await user.tab();
    await user.tab();
    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(opt(2)).toHaveFocus();
    await user.tab();
    expect(after()).toHaveFocus();
    await user.tab({ shift: true });
    expect(opt(4)).toHaveFocus();
  });

  it('Enter and Space select the focused option', async () => {
    const user = setup();
    render(<Group />);
    await user.tab();
    await user.tab();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(opt(1)).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{ArrowRight}[Space]');
    expect(opt(2)).toHaveAttribute('aria-pressed', 'true');
  });

  it('a grid also moves by row and keeps the column when wrapping', async () => {
    const user = setup();
    render(<Group count={8} columns={3} grid />);
    await user.tab();
    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(opt(3)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(opt(6)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(opt(0)).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(opt(6)).toHaveFocus();
    await user.keyboard('{ArrowRight}{ArrowUp}');
    expect(opt(4)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(opt(7)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(opt(1)).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(opt(7)).toHaveFocus();
  });

  it('reads the row length from the layout when columns is auto', async () => {
    // jsdom has no layout: put three options on each row.
    const desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop')!;
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
      configurable: true,
      get() {
        const i = Number((this as HTMLElement).textContent?.slice(1));
        return Number.isNaN(i) ? 0 : Math.floor(i / 3) * 50;
      },
    });
    try {
      const user = setup();
      render(<Group count={8} columns="auto" grid />);
      await user.tab();
      await user.tab();
      await user.keyboard('{ArrowDown}');
      expect(opt(3)).toHaveFocus();
      await user.keyboard('{ArrowDown}{ArrowDown}');
      expect(opt(0)).toHaveFocus();
    } finally {
      Object.defineProperty(HTMLElement.prototype, 'offsetTop', desc);
    }
  });
});
