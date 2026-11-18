import { act, render, screen } from '@testing-library/react';
import { Component, Suspense, type ReactNode } from 'react';
import { preloadable } from './preloadable';

const Hello = ({ who }: { who: string }) => <p>hello {who}</p>;

class Catch extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError = () => ({ failed: true });
  render() {
    return this.state.failed ? <p>failed</p> : this.props.children;
  }
}

describe('preloadable', () => {
  it('renders at once, with no fallback, once preloaded', async () => {
    const load = vi.fn(() => Promise.resolve({ default: Hello }));
    const C = preloadable(load);
    await C.preload();
    await C.preload();
    render(
      <Suspense fallback={<p>loading</p>}>
        <C who="Riya" />
      </Suspense>,
    );
    // Synchronously there: a lazy() would show the fallback first.
    expect(screen.getByText('hello Riya')).toBeInTheDocument();
    expect(screen.queryByText('loading')).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('suspends like lazy() when not preloaded, and keeps the same instance once loaded', async () => {
    let done!: (m: { default: typeof Hello }) => void;
    const C = preloadable(() => new Promise<{ default: typeof Hello }>((ok) => (done = ok)));
    const { rerender } = render(
      <Suspense fallback={<p>loading</p>}>
        <C who="Kabir" />
      </Suspense>,
    );
    expect(screen.getByText('loading')).toBeInTheDocument();
    await act(async () => done({ default: Hello }));
    const p = screen.getByText('hello Kabir');
    rerender(
      <Suspense fallback={<p>loading</p>}>
        <C who="Kabir" />
      </Suspense>,
    );
    expect(screen.getByText('hello Kabir')).toBe(p);
  });

  it('stays failed like lazy() until reset, then fetches again', async () => {
    const load = vi
      .fn<() => Promise<{ default: typeof Hello }>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ default: Hello });
    const C = preloadable(load);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const tree = (k: number) => (
      <Catch key={k}>
        <Suspense fallback={<p>loading</p>}>
          <C who="Meera" />
        </Suspense>
      </Catch>
    );
    const { rerender } = render(tree(0));
    expect(await screen.findByText('failed')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
    C.reset();
    rerender(tree(1));
    expect(await screen.findByText('hello Meera')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('a failed background preload leaves nothing behind', async () => {
    const load = vi
      .fn<() => Promise<{ default: typeof Hello }>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ default: Hello });
    const C = preloadable(load);
    await expect(C.preload()).rejects.toThrow('offline');
    render(
      <Suspense fallback={<p>loading</p>}>
        <C who="Dev" />
      </Suspense>,
    );
    expect(await screen.findByText('hello Dev')).toBeInTheDocument();
  });
});
