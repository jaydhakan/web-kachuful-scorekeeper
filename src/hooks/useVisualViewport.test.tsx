import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useVisualViewport } from './useVisualViewport';

class FakeViewport extends EventTarget {
  height = 768;
  resize(h: number) {
    this.height = h;
    this.dispatchEvent(new Event('resize'));
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
  });
});
