import {
  Component,
  createElement,
  lazy,
  Suspense,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';

type Load<P> = () => Promise<{ default: ComponentType<P> }>;

// One lazy() per loader and attempt: React keeps a failed lazy() failed, so a retry needs a fresh one.
const made = new Map<unknown, Map<number, ComponentType<never>>>();
function lazyOf<P>(load: Load<P>, attempt: number): ComponentType<P> {
  let byAttempt = made.get(load);
  if (!byAttempt) made.set(load, (byAttempt = new Map()));
  let C = byAttempt.get(attempt);
  if (!C) byAttempt.set(attempt, (C = lazy(load) as unknown as ComponentType<never>));
  return C as unknown as ComponentType<P>;
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
  return (
    <Boundary key={attempt} failed={failed(() => setAttempt((a) => a + 1))}>
      <Suspense fallback={loading}>{createElement(lazyOf(load, attempt), props)}</Suspense>
    </Boundary>
  );
}
