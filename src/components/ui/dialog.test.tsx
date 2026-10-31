import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Modal } from './Modal';
import { Sheet } from './Sheet';

function Harness({ kind }: { kind: 'sheet' | 'modal' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && kind === 'sheet' && (
        <Sheet title="Menu" onClose={() => setOpen(false)}>
          <button>First</button>
          <button>Last</button>
        </Sheet>
      )}
      {open && kind === 'modal' && (
        <Modal text="Sure?" ok="Yes" onOk={() => setOpen(false)} onCancel={() => setOpen(false)} />
      )}
    </>
  );
}

const u = () => userEvent.setup({ pointerEventsCheck: 0 });

describe.each(['sheet', 'modal'] as const)('%s dialog behaviour', (kind) => {
  it('is a labelled modal dialog and moves focus inside', async () => {
    const user = u();
    render(<Harness kind={kind} />);
    await user.click(screen.getByText('Open'));
    const d = screen.getByRole(kind === 'sheet' ? 'dialog' : 'alertdialog');
    expect(d).toHaveAttribute('aria-modal', 'true');
    expect(d).toHaveAccessibleName();
    expect(d).toContainElement(document.activeElement as HTMLElement);
  });

  it('traps Tab inside, in both directions', async () => {
    const user = u();
    render(<Harness kind={kind} />);
    await user.click(screen.getByText('Open'));
    const d = screen.getByRole(kind === 'sheet' ? 'dialog' : 'alertdialog');
    for (let i = 0; i < 8; i++) {
      await user.tab();
      expect(d).toContainElement(document.activeElement as HTMLElement);
    }
    for (let i = 0; i < 8; i++) {
      await user.tab({ shift: true });
      expect(d).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('closes on Escape and returns focus to the opener', async () => {
    const user = u();
    render(<Harness kind={kind} />);
    const opener = screen.getByText('Open');
    await user.click(opener);
    opener.focus();
    await user.click(opener);
    await user.keyboard('{Escape}');
    await vi.waitFor(() =>
      expect(
        screen.queryByRole(kind === 'sheet' ? 'dialog' : 'alertdialog'),
      ).not.toBeInTheDocument(),
    );
    expect(opener).toHaveFocus();
  });
});

describe('locked modal', () => {
  it('ignores Escape so a choice has to be made', async () => {
    const user = u();
    const onCancel = vi.fn();
    render(
      <Modal
        locked
        text="Pick"
        ok="Reset"
        cancel="Keep"
        onOk={() => undefined}
        onCancel={onCancel}
      />,
    );
    await user.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
    await user.click(screen.getByText('Keep'));
    expect(onCancel).toHaveBeenCalled();
  });
});
