import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useVisualViewport } from './useVisualViewport';

class FakeViewport extends EventTarget {
  height = 768;
  pageTop = 0;
  resize(h: number) {
    this.height = h;
    this.dispatchEvent(new Event('resize'));
  }
  scroll(top: number) {
    this.pageTop = top;
    this.dispatchEvent(new Event('scroll'));
  }
}

function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  useVisualViewport(ref);
  return (
    <div ref={ref} data-testid="root">
      <input aria-label="name" />
      <button>Other</button>
    </div>
  );
}

describe('useVisualViewport', () => {
  let vv: FakeViewport;
  beforeEach(() => {
    vv = new FakeViewport();
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
  });

  it('sizes the root to the visible area while a field has focus and the keyboard is up', () => {
    render(<Probe />);
    screen.getByLabelText('name').focus();
    act(() => vv.resize(420));
    expect(screen.getByTestId('root').style.height).toBe('420px');
  });

  it('follows the visible area when the browser scrolls the page to show the field', () => {
    render(<Probe />);
    screen.getByLabelText('name').focus();
    act(() => vv.resize(420));
    act(() => vv.scroll(240));
    const root = screen.getByTestId('root');
    expect(root.style.height).toBe('420px');
    expect(root.style.top).toBe('240px');
  });

  it('marks the root while the keyboard is up, and clears it when the field loses focus', async () => {
    render(<Probe />);
    const input = screen.getByLabelText('name');
    input.focus();
    act(() => vv.resize(420));
    expect(screen.getByTestId('root').hasAttribute('data-kb')).toBe(true);
    input.blur();
    act(() => vv.resize(768));
    await act(() => new Promise((r) => setTimeout(r, 5)));
    expect(screen.getByTestId('root').hasAttribute('data-kb')).toBe(false);
  });

  it('marks the keyboard on Android, where the page itself shrinks, without resizing the root', () => {
    render(<Probe />);
    screen.getByLabelText('name').focus();
    Object.defineProperty(window, 'innerHeight', { value: 420, configurable: true });
    act(() => vv.resize(420));
    const root = screen.getByTestId('root');
    expect(root.hasAttribute('data-kb')).toBe(true);
    expect(root.style.height).toBe('');
  });

  it('leaves the root alone when nothing is being typed into', () => {
    render(<Probe />);
    screen.getByRole('button', { name: 'Other' }).focus();
    act(() => vv.resize(420));
    expect(screen.getByTestId('root').style.height).toBe('');
  });

  it('ignores a small change, which is browser chrome and not a keyboard', () => {
    render(<Probe />);
    screen.getByLabelText('name').focus();
    act(() => vv.resize(730));
    expect(screen.getByTestId('root').style.height).toBe('');
  });

  it('gives the height back when the field loses focus', async () => {
    render(<Probe />);
    const input = screen.getByLabelText('name');
    input.focus();
    act(() => vv.resize(420));
    input.blur();
    await act(() => new Promise((r) => setTimeout(r, 5)));
    expect(screen.getByTestId('root').style.height).toBe('');
    expect(screen.getByTestId('root').style.top).toBe('');
  });
});
