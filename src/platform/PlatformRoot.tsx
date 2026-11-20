import { useReducedMotion } from 'framer-motion';
import {
  Component,
  createElement,
  startTransition,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Loader } from '@/components/ui/Loader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { CrownNewsMount } from '@/components/crowns/CrownNewsMount';
import { SeatInvitesMount } from '@/components/seat-invites/SeatInvitesMount';
import { platform } from '@/strings/platform';
import { gameById } from './catalog';
import { NavProgress } from './NavProgress';
import { PlatformNotice } from './PlatformNotice';
import { PlatformUpdate } from './PlatformUpdate';
import { Landing, preparePage, rootOf } from './prepare';
import { go, useGame, type GameId } from './route';

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
      const h = document.querySelector<HTMLElement>('#root [data-page]:not([inert]) h1');
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

// However it is opened (tile, Resume, Back, address), a game rises in (400ms) and the landing page settles in (240ms)
// over the page it replaces, which stays opaque underneath until it is covered: no frame of bare background. A CSS
// animation (index.css, `.page-in-*`) ends on the page's own style, where a script-driven one can drop a frame on a
// slow phone as it hands back. Reduced motion: the pages swap at once.
const ENTER_MS = { game: 400, landing: 240 };

// Past this, the next page is shown anyway, with its own loader (or its Retry, offline).
const HOLD_MAX_MS = 5000;

type PageKey = GameId | 'landing';

/**
 * The page on screen trails the address: a move keeps the current page (with a progress bar past 400ms) until the
 * next one's chunks have arrived, then swaps, so a tap never lands on a blank screen or a flash of the loader.
 */
function useShownPage(target: PageKey): { shown: PageKey; waiting: boolean } {
  const [shown, setShown] = useState(target);
  useEffect(() => {
    if (target === shown) return;
    let live = true;
    const show = () => {
      if (!live) return;
      live = false;
      clearTimeout(cap);
      startTransition(() => setShown(target));
    };
    const cap = setTimeout(show, HOLD_MAX_MS);
    void preparePage(target === 'landing' ? null : target, location.search).then(show);
    return () => {
      live = false;
      clearTimeout(cap);
    };
  }, [target, shown]);
  return { shown, waiting: target !== shown };
}

/**
 * The pages on screen: the one shown, and for the length of its entrance the one it covers. Worked out while
 * rendering, so the covered page never leaves the tree for a render (which would remount it and lose its state).
 */
function usePageStack(shown: PageKey, reduced: boolean): { stack: PageKey[]; moved: boolean } {
  const [s, set] = useState<{ shown: PageKey; under: PageKey | null; moved: boolean }>({
    shown,
    under: null,
    moved: false,
  });
  let now = s;
  if (s.shown !== shown) {
    now = { shown, under: reduced ? null : s.shown, moved: true };
    set(now);
  }
  useEffect(() => {
    if (!now.under) return;
    const tm = setTimeout(
      () => set((x) => ({ ...x, under: null })),
      ENTER_MS[now.shown === 'landing' ? 'landing' : 'game'],
    );
    return () => clearTimeout(tm);
  }, [now.under, now.shown]);
  return {
    stack: now.under && now.under !== shown ? [now.under, shown] : [shown],
    moved: now.moved,
  };
}

/** The site: the landing page at `/`, else the game the path names, each loaded on demand. */
export function PlatformRoot() {
  const id = useGame();
  const live = !!id && gameById(id).status === 'live';
  const reduced = !!useReducedMotion();
  const { shown, waiting } = useShownPage(live ? id : 'landing');
  const { stack, moved } = usePageStack(shown, reduced);
  useFocusHeading(shown);
  const game = shown === 'landing' ? null : shown;
  return (
    <>
      <div className="relative h-full w-full">
        {stack.map((k) => {
          const leaving = k !== shown;
          // The first page draws at once; only a move between pages animates.
          const anim =
            leaving || reduced || !moved ? '' : `page-in-${k === 'landing' ? 'landing' : 'game'}`;
          return (
            <div
              key={k}
              data-page
              className={`absolute inset-0 ${leaving ? 'pointer-events-none z-0' : `z-[1] ${anim}`}`}
              {...(leaving ? { inert: '' as const, 'aria-hidden': true } : {})}
            >
              <Page id={k === 'landing' ? null : k} />
            </div>
          );
        })}
      </div>
      {waiting && <NavProgress />}
      <SeatInvitesMount />
      <CrownNewsMount />
      <PlatformUpdate game={game} />
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
  const C = id ? rootOf(id) : Landing;
  const retry = () => {
    C.reset();
    setAttempt((a) => a + 1);
  };
  return (
    <LoadBoundary landing={!id} key={`${id ?? 'landing'}-${attempt}`} onRetry={retry}>
      <Suspense fallback={<Spinner />}>{createElement(C)}</Suspense>
    </LoadBoundary>
  );
}
