import {
  Component,
  createElement,
  Suspense,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { preloadable, type Preloadable } from '@/lib/preloadable';

type Load<P> = () => Promise<{ default: ComponentType<P> }>;

// One preloadable per loader, so prepare() and the screen share it: a part warmed ahead renders with no fallback.
const parts = new Map<unknown, Preloadable<never>>();
export function partOf<P extends object>(load: Load<P>): Preloadable<P> {
  let C = parts.get(load);
  if (!C) parts.set(load, (C = preloadable(load) as unknown as Preloadable<never>));
  return C as unknown as Preloadable<P>;
}

class Boundary extends Component<{ failed: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError = () => ({ failed: true });
  render() {
    return this.state.failed ? this.props.failed : this.props.children;
  }
}

/**
 * A lazy part of Spades with its loading and failed states: `failed(retry)` shows when the chunk can't be fetched
 * (offline, never cached), and retry fetches it again. `load` must be a module-level constant.
 */
export function LazyPart<P extends object>({
  load,
  props,
  loading,
  failed,
}: {
  load: Load<P>;
  props: P;
  loading: ReactNode;
  failed: (retry: () => void) => ReactNode;
}) {
  const [attempt, setAttempt] = useState(0);
  const part = partOf(load);
  const retry = () => {
    part.reset();
    setAttempt((a) => a + 1);
  };
  return (
    <Boundary key={attempt} failed={failed(retry)}>
      <Suspense fallback={loading}>{createElement(part, props)}</Suspense>
    </Boundary>
  );
}
