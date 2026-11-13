import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { BidKeys, BidStepper, bidValues, snapBid, stepBid } from './BidKeypad';

const KT = { min: 150, max: 250, step: 5 };

describe('bid range helpers', () => {
  it('lists every value on the step', () => {
    expect(bidValues({ max: 3 })).toEqual([0, 1, 2, 3]);
    expect(bidValues({ min: 150, max: 170, step: 5 })).toEqual([150, 155, 160, 165, 170]);
    expect(bidValues({ min: 5, max: 3 })).toEqual([]);
  });
  it('snaps down to a step and clamps to the range', () => {
    expect(snapBid(163, KT)).toBe(160);
    expect(snapBid(100, KT)).toBe(150);
    expect(snapBid(999, KT)).toBe(250);
    // A max off the grid clamps to the highest step under it.
    expect(snapBid(999, { min: 0, max: 12, step: 5 })).toBe(10);
  });
  it('steps by quick increments within the range', () => {
    expect(stepBid(150, 25, KT)).toBe(175);
    expect(stepBid(150, -5, KT)).toBe(150);
    expect(stepBid(240, 25, KT)).toBe(250);
  });
});

describe('BidKeys', () => {
  it('draws one key per value and reports the picked key', async () => {
    const onPick = vi.fn();
    render(<BidKeys max={4} label="Bid for Riya" selected={2} onPick={onPick} />);
    const group = screen.getByRole('group', { name: 'Bid for Riya' });
    expect(group.querySelectorAll('button')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Bid 2' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Bid 3' }));
    expect(onPick).toHaveBeenCalledWith(3, screen.getByRole('button', { name: 'Bid 3' }));
  });
  it('marks a locked key, which can still be tapped (to explain why)', async () => {
    const onPick = vi.fn();
    render(<BidKeys max={3} label="Bid" locked={[1]} describedBy="why" onPick={onPick} />);
    const key = screen.getByRole('button', { name: 'Locked 1' });
    expect(key).toHaveAttribute('aria-disabled', 'true');
    expect(key).toHaveAttribute('aria-describedby', 'why');
    await userEvent.click(key);
    expect(onPick).toHaveBeenCalledWith(1, key);
  });
  it.each(['dock', 'pane'] as const)(
    'a %s key that becomes locked is the same node and gets the lock, then gives it back',
    (look) => {
      const props = { look, max: 3, label: 'Bid', describedBy: 'why', onPick: () => {} };
      const { rerender } = render(<BidKeys {...props} />);
      const key = screen.getByRole('button', { name: 'Bid 1' });
      // Nothing fades on mount, only on a change.
      expect(key.querySelector('[data-lock-fade]')).toBeNull();
      rerender(<BidKeys {...props} locked={[1]} />);
      expect(screen.getByRole('button', { name: 'Locked 1' })).toBe(key);
      expect(key).toHaveAttribute('aria-disabled', 'true');
      expect(key).toHaveAttribute('aria-describedby', 'why');
      // The old and new materials cross-fade as two layers; the large-screen key also gets its lock icon.
      expect(key.querySelectorAll('[data-lock-fade]')).toHaveLength(2);
      expect(!!key.querySelector('[data-lock]')).toBe(look === 'pane');
      expect(
        screen.getByRole('button', { name: 'Bid 2' }).querySelector('[data-lock-fade]'),
      ).toBeNull();
      rerender(<BidKeys {...props} />);
      expect(screen.getByRole('button', { name: 'Bid 1' })).toBe(key);
      expect(key).not.toHaveAttribute('aria-disabled');
      expect(key).not.toHaveAttribute('aria-describedby');
    },
  );
  it('a key locked from the start does not fade in', () => {
    render(<BidKeys max={3} label="Bid" locked={[1]} onPick={() => {}} />);
    expect(document.querySelector('[data-lock-fade]')).toBeNull();
  });
  it('wears its material again once the fade is over', async () => {
    const { rerender } = render(<BidKeys max={3} label="Bid" onPick={() => {}} />);
    rerender(<BidKeys max={3} label="Bid" locked={[1]} onPick={() => {}} />);
    const key = screen.getByRole('button', { name: 'Locked 1' });
    expect(key.className).not.toContain('mat-key-no');
    await waitFor(() => expect(key.querySelector('[data-lock-fade]')).toBeNull());
    expect(key.className).toContain('mat-key-no');
  });
  it('moves focus with the arrow keys', async () => {
    render(<BidKeys look="pane" max={3} label="Bid" selected={0} onPick={() => {}} />);
    screen.getByRole('button', { name: 'Bid 0' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Bid 1' })).toHaveFocus();
  });
});

function Stepper({ onConfirm }: { onConfirm: (v: number) => void }) {
  const [v, setV] = useState(150);
  return (
    <BidStepper
      {...KT}
      value={v}
      onChange={setV}
      quick={[-5, 5, 10, 25]}
      confirmLabel={`Riya · ${v}`}
      onConfirm={onConfirm}
    />
  );
}

describe('BidStepper', () => {
  it('changes by quick increments, never past the range, and confirms the amount', async () => {
    const onConfirm = vi.fn();
    render(<Stepper onConfirm={onConfirm} />);
    const amount = screen.getByRole('spinbutton', { name: 'Bid amount' });
    expect(amount).toHaveAttribute('aria-valuenow', '150');
    expect(screen.getByRole('button', { name: 'Down 5' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Up 25' }));
    await userEvent.click(screen.getByRole('button', { name: 'Up 10' }));
    expect(amount).toHaveAttribute('aria-valuenow', '185');
    await userEvent.click(screen.getByRole('button', { name: 'Riya · 185' }));
    expect(onConfirm).toHaveBeenCalledWith(185);
  });
  it('steps from the keyboard and stops at the ends', () => {
    render(<Stepper onConfirm={() => {}} />);
    const amount = screen.getByRole('spinbutton');
    fireEvent.keyDown(amount, { key: 'ArrowUp' });
    expect(amount).toHaveAttribute('aria-valuenow', '155');
    fireEvent.keyDown(amount, { key: 'PageUp' });
    expect(amount).toHaveAttribute('aria-valuenow', '180');
    fireEvent.keyDown(amount, { key: 'End' });
    expect(amount).toHaveAttribute('aria-valuenow', '250');
    expect(screen.getByRole('button', { name: 'Up 5' })).toBeDisabled();
    fireEvent.keyDown(amount, { key: 'Home' });
    expect(amount).toHaveAttribute('aria-valuenow', '150');
  });
  it('shows an off-grid value snapped to the range', () => {
    render(<BidStepper {...KT} value={163} onChange={() => {}} />);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-valuenow', '160');
    expect(screen.queryByRole('button')).toBeNull();
  });
});
