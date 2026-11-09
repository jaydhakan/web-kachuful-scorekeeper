import { Component, createElement, lazy, Suspense, useState, type ComponentType, type ReactNode } from 'react';
import { Loader } from '@/components/ui/Loader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { platform } from '@/strings/platform';
import { gameById } from './catalog';
import { go, useGame, type GameId } from './route';

const Landing = lazy(() => import('./landing/Landing'));

// One lazy component per game, made once, so going back and forth never re-suspends a game already loaded.
// A retry gets a fresh one, since React keeps a failed lazy() failed.
const roots = new Map<string, ComponentType>();
const rootOf = (id: GameId, attempt: number) => {
  const key = `${id}:${attempt}`;
  let C = roots.get(key);
  if (!C) roots.set(key, (C = lazy(gameById(id).load)));
  return C;
};

/** A game's chunk that can't be fetched (offline, never cached) says so with Retry, instead of a blank page. */
class LoadBoundary extends Component<
  { onRetry: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError = () => ({ failed: true });
  render() {
    if (!this.state.failed) return this.props.children;
    const s = platform.loadFailed;
    return (
      <div className="app-root scr-bg grid h-full w-full place-content-center gap-4 p-6 text-center">
        <h1 className="text-24 font-bold">{s.title}</h1>
        <p className="max-w-[34ch] text-16 text-[var(--tx2)]">{s.body}</p>
        <PrimaryButton
          onClick={() => {
            this.setState({ failed: false });
            this.props.onRetry();
          }}
        >
          {s.retry}
        </PrimaryButton>
        <button type="button" className="min-h-11 text-16 underline" onClick={() => go(null)}>
          {s.home}
        </button>
      </div>
    );
  }
}

/** The site: the landing page at `/`, else the game the path names, each loaded on demand. */
export function PlatformRoot() {
  const id = useGame();
  const [attempt, setAttempt] = useState(0);
  if (!id || gameById(id).status !== 'live') {
    return (
      <Suspense fallback={<div className="app-root scr-bg h-full w-full" />}>
        <Landing />
      </Suspense>
    );
  }
  return (
    <LoadBoundary key={`${id}-${attempt}`} onRetry={() => setAttempt((a) => a + 1)}>
      <Suspense
        fallback={
          <div className="app-root scr-bg relative h-full w-full">
            <Loader />
          </div>
        }
      >
        {/* Cached per game and attempt (rootOf), so this never remounts a game on a re-render. */}
        {createElement(rootOf(id, attempt))}
      </Suspense>
    </LoadBoundary>
  );
}
