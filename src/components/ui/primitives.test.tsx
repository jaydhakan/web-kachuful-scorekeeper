import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { COLORS } from '@/people';
import { t } from '@/strings';
import { Field, LookPicker } from './Field';
import { Modal } from './Modal';
import { PrimaryButton } from './PrimaryButton';
import { Sheet } from './Sheet';

describe('shared primitives', () => {
  it('says a field error in the danger colour, with a mark, tied to the field', () => {
    render(<Field label="Email" value="" onChange={() => {}} error="Enter your email" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Enter your email');
    expect(alert.className).toContain('text-[var(--neg-tx)]');
    expect(alert.querySelector('svg')).not.toBeNull();
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter your email');
  });

  it('names every colour swatch in words', () => {
    render(<LookPicker emoji="🦁" color={COLORS[0]} onChange={() => {}} />);
    expect(t.hub.auth.colourNames).toHaveLength(COLORS.length);
    expect(screen.getByRole('button', { name: 'Coral' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /^#/ })).toBeNull();
  });

  it('describes a confirm dialog with its body text', () => {
    render(
      <Modal
        text="Sign out?"
        body="Your games stay."
        ok="Sign out"
        onOk={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription('Your games stay.');
  });

  it('lets a sheet title wrap beside a close button that never shrinks', () => {
    render(
      <Sheet title="a.very.long.address@example.com" onClose={() => {}}>
        <p>Body</p>
      </Sheet>,
    );
    const h = screen.getByRole('heading', { name: 'a.very.long.address@example.com' });
    expect(h.className).toMatch(/min-w-0/);
    expect(h.className).toMatch(/overflow-wrap:anywhere/);
    expect(screen.getByRole('button', { name: t.common.close }).className).toMatch(/shrink-0/);
  });

  it('ignores a second tap while busy and says it is working', async () => {
    const click = vi.fn();
    render(
      <PrimaryButton busy onClick={click}>
        Save
      </PrimaryButton>,
    );
    const b = screen.getByRole('button', { name: 'Save' });
    expect(b).toHaveAttribute('aria-busy', 'true');
    await userEvent.setup({ pointerEventsCheck: 0 }).click(b);
    expect(click).not.toHaveBeenCalled();
  });
});
