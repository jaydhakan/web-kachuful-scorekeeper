import { fireEvent, render, screen } from '@testing-library/react';
import { shortcutOf, useShortcuts, type Shortcuts } from './useShortcuts';

const key = (k: string, o: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { key: k, ...o });

function Harness({ map, enabled }: { map: Shortcuts; enabled?: boolean }) {
  useShortcuts(map, enabled);
  return (
    <>
      <input aria-label="name" />
      <button type="button">plain</button>
      <button type="button" aria-pressed="true">
        picked
      </button>
    </>
  );
}

describe('shortcutOf', () => {
  it('names letters, digits, Enter, ? and ⌘/Ctrl+Z', () => {
    expect(shortcutOf(key('Z'))).toBe('z');
    expect(shortcutOf(key('7'))).toBe('digit');
    expect(shortcutOf(key('Enter'))).toBe('enter');
    expect(shortcutOf(key('?', { shiftKey: true }))).toBe('?');
    expect(shortcutOf(key('z', { metaKey: true }))).toBe('undo');
    expect(shortcutOf(key('z', { ctrlKey: true }))).toBe('undo');
  });

  it('leaves other modified keys and named keys alone', () => {
    expect(shortcutOf(key('z', { ctrlKey: true, shiftKey: true }))).toBeNull();
    expect(shortcutOf(key('e', { altKey: true }))).toBeNull();
    expect(shortcutOf(key('r', { metaKey: true }))).toBeNull();
    expect(shortcutOf(key('Tab'))).toBeNull();
    expect(shortcutOf(key('ArrowUp'))).toBeNull();
  });
});

describe('useShortcuts', () => {
  it('runs the handler for a key pressed on the page', () => {
    const e = vi.fn(),
      digit = vi.fn();
    render(<Harness map={{ e, digit }} />);
    fireEvent.keyDown(document.body, { key: 'e' });
    fireEvent.keyDown(document.body, { key: '4' });
    expect(e).toHaveBeenCalledTimes(1);
    expect(digit).toHaveBeenCalledTimes(1);
    expect(digit.mock.calls[0][0].key).toBe('4');
  });

  it('ignores keys typed into a field', () => {
    const n = vi.fn(),
      enter = vi.fn();
    render(<Harness map={{ n, enter }} />);
    const field = screen.getByLabelText('name');
    fireEvent.keyDown(field, { key: 'n' });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(n).not.toHaveBeenCalled();
    expect(enter).not.toHaveBeenCalled();
  });

  it('leaves Enter to a focused button, unless that option is already picked', () => {
    const enter = vi.fn();
    render(<Harness map={{ enter }} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'plain' }), { key: 'Enter' });
    expect(enter).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('button', { name: 'picked' }), { key: 'Enter' });
    expect(enter).toHaveBeenCalledTimes(1);
  });

  it('does nothing while a dialog is open, when disabled, or on a held key', () => {
    const z = vi.fn(),
      digit = vi.fn();
    const { rerender } = render(<Harness map={{ z, digit }} />);
    fireEvent.keyDown(document.body, { key: 'z', repeat: true });
    expect(z).not.toHaveBeenCalled();
    // Digits may repeat: holding one is still a pick.
    fireEvent.keyDown(document.body, { key: '2', repeat: true });
    expect(digit).toHaveBeenCalledTimes(1);

    const dialog = document.createElement('div');
    dialog.setAttribute('aria-modal', 'true');
    document.body.append(dialog);
    fireEvent.keyDown(document.body, { key: 'z' });
    expect(z).not.toHaveBeenCalled();
    dialog.remove();

    rerender(<Harness map={{ z, digit }} enabled={false} />);
    fireEvent.keyDown(document.body, { key: 'z' });
    expect(z).not.toHaveBeenCalled();
    rerender(<Harness map={{ z, digit }} />);
    fireEvent.keyDown(document.body, { key: 'z' });
    expect(z).toHaveBeenCalledTimes(1);
  });

  it('maps ⌘/Ctrl+Z to undo, or to Z when only Z is bound', () => {
    const undo = vi.fn(),
      z = vi.fn();
    const { rerender } = render(<Harness map={{ undo }} />);
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true });
    expect(undo).toHaveBeenCalledTimes(1);
    rerender(<Harness map={{ z }} />);
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    expect(z).toHaveBeenCalledTimes(1);
  });

  it('skips a key another handler already took', () => {
    const e = vi.fn();
    render(<Harness map={{ e }} />);
    const ev = new KeyboardEvent('keydown', { key: 'e', bubbles: true, cancelable: true });
    ev.preventDefault();
    document.body.dispatchEvent(ev);
    expect(e).not.toHaveBeenCalled();
  });
});
