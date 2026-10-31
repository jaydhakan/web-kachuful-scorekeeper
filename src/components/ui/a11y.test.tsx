import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Glass } from './Glass';
import { Seg } from './Seg';
import { Toast } from './Toast';

function Demo() {
  const [v, setV] = useState<'made' | 'missed'>('made');
  return (
    <Seg<'made' | 'missed'>
      uid="t"
      value={v}
      onChange={setV}
      options={[
        { v: 'made', label: 'Made' },
        { v: 'missed', label: 'Missed' },
      ]}
    />
  );
}

describe('Seg commits on release', () => {
  it('ignores a press that never becomes a click (a scroll starting on it)', () => {
    render(<Demo />);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Missed' }));
    expect(screen.getByRole('button', { name: 'Made' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Missed' }));
    expect(screen.getByRole('button', { name: 'Missed' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('keyboard and assistive tech', () => {
  it('Seg is operable with the keyboard and exposes its state', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<Demo />);
    expect(screen.getByRole('button', { name: 'Made' })).toHaveAttribute('aria-pressed', 'true');
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Missed' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Missed' })).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('[Space]');
    expect(screen.getByRole('button', { name: 'Missed' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('a clickable Glass card is a real keyboard button', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onClick = vi.fn();
    render(<Glass onClick={onClick}>Resume game</Glass>);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Resume game' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('a plain Glass card is not a button', () => {
    render(<Glass>Info</Glass>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('announces toasts politely', () => {
    render(<Toast toast={{ id: 1, msg: 'Bid saved', undo: true }} onUndo={() => undefined} />);
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('Bid saved');
  });
});
