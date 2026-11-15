import { m, useReducedMotion, type Target, type Transition } from 'framer-motion';
import {
  Component,
  createElement,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { Loader } from '@/components/ui/Loader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EXIT } from '@/components/ui/motion';
import { platform } from '@/strings/platform';
import { gameById } from './catalog';
import { PlatformNotice } from './PlatformNotice';
import { PlatformUpdate } from './PlatformUpdate';
import { go, useGame, type GameId } from './route';

// Like the games', a retry needs a fresh lazy(): React keeps a failed one failed.
const landings = new Map<number, ComponentType>();
const landingOf = (attempt: number) => {
  let C = landings.get(attempt);
  if (!C) landings.set(attempt, (C = lazy(() => import('./landing/Landing'))));
  return C;
};

// One lazy component per game, made once, so going back and forth never re-suspends a game already loaded.
// A retry gets a fresh one, since React keeps a failed lazy() failed.
const roots = new Map<string, ComponentType>();
const rootOf = (id: GameId, attempt: number) => {
  const key = `${id}:${attempt}`;
  let C = roots.get(key);
  if (!C) roots.set(key, (C = lazy(gameById(id).load)));
  return C;
};

/** A chunk that can't be fetched (offline, never cached) says so with Retry, instead of a blank page. */
class LoadBoundary extends Component<
  { onRetry: () => void; landing?: boolean; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError = () => ({ failed: true });
  render() {
    if (!this.state.failed) return this.props.children;
    const s = this.props.landing ? platform.landingFailed : platform.loadFailed;
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
        {!this.props.landing && (
          <button type="button" className="min-h-11 text-16 underline" onClick={() => go(null)}>
            {platform.loadFailed.home}
          </button>
        )}
      </div>
    );
  }
}

/**
 * After moving between the landing page and a game, focus goes to the new page's main heading, so a screen reader
 * starts there; it waits (up to ~2s) for a game's chunk to arrive.
 */
function useFocusHeading(key: string) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    let raf = 0,
      n = 0;
    const tryFocus = () => {
      const h = document.querySelector<HTMLElement>('#root h1');
      if (!h) {
        if (++n < 120) raf = requestAnimationFrame(tryFocus);
        return;
      }
      if (!h.hasAttribute('tabindex')) h.tabIndex = -1;
      h.focus({ preventScroll: true });
    };
    raf = requestAnimationFrame(tryFocus);
    return () => cancelAnimationFrame(raf);
  }, [key]);
}

// However it is opened (tile, Resume, Back, address), a game rises in (400ms ease-out). Going back settles the
// landing page in (240ms).
const OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
function enter(game: boolean, reduced: boolean): [Target, Transition] {
  if (reduced) return [{ opacity: 0 }, { duration: 0.12 }];
  return game
    ? [
        { opacity: 0, y: 16 },
        { duration: 0.4, ease: OUT },
      ]
    : [
        { opacity: 0, scale: 0.98 },
        { duration: EXIT, ease: OUT },
      ];
}

// The first page draws at once; only a move between pages animates.
let drawn = false;

/** The site: the landing page at `/`, else the game the path names, each loaded on demand. */
export function PlatformRoot() {
  const id = useGame();
  const live = !!id && gameById(id).status === 'live';
  const key = live ? id : 'landing';
  const reduced = !!useReducedMotion();
  useEffect(() => {
    drawn = true;
  }, []);
  useFocusHeading(key);
  const [from, transition] = enter(live, reduced);
  return (
    <>
      <m.div
        key={key}
        className="relative h-full w-full"
        initial={drawn ? from : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={transition}
      >
        <Page id={live ? id : null} />
      </m.div>
      <PlatformUpdate game={live ? id : null} />
      <PlatformNotice />
    </>
  );
}

const Spinner = () => (
  <div className="app-root scr-bg relative h-full w-full">
    <Loader />
  </div>
);

function Page({ id }: { id: GameId | null }) {
  const [attempt, setAttempt] = useState(0);
  if (!id) {
    return (
      <LoadBoundary landing key={`landing-${attempt}`} onRetry={() => setAttempt((a) => a + 1)}>
        <Suspense fallback={<Spinner />}>{createElement(landingOf(attempt))}</Suspense>
      </LoadBoundary>
    );
  }
  return (
    <LoadBoundary key={`${id}-${attempt}`} onRetry={() => setAttempt((a) => a + 1)}>
      <Suspense fallback={<Spinner />}>
        {/* Cached per game and attempt (rootOf), so this never remounts a game on a re-render. */}
        {createElement(rootOf(id, attempt))}
      </Suspense>
    </LoadBoundary>
  );
}
