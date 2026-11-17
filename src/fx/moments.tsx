import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { GAME_END_MAX_MS, MOMENT_MAX_MS } from '@/components/ui/motion';
import { vibrate, type Haptic } from '@/hooks/useHaptics';
import { fx as s } from '@/strings/fx';
import { armAudio, cue, type SoundName, type SoundTier } from './sound';
import { reducedMotion } from './waapi';

/** WOW-MOMENTS-PLAN §2.1: a Moment may take the screen (one at a time, capped); Beats and Ticks never wait. */
export type MomentTier = SoundTier;

/** Higher plays first: game end > Boston or trap > big unlock > small unlock (§3.2). */
export const PRIORITY = { smallUnlock: 1, bigUnlock: 2, verdict: 3, gameEnd: 4 } as const;

export interface MomentCtx {
  /** Aborted when the moment is skipped, runs past its ceiling, or the queue is cleared: stop its animations. */
  signal: AbortSignal;
}

export interface MomentSpec {
  /** Stable for the event it shows (`boston:<table>:<hand>`): a re-render or a reconnect never plays it twice. */
  id: string;
  tier: MomentTier;
  /** `PRIORITY`; only Moments are ordered. */
  priority: number;
  /** The hand or round it belongs to: at most `cap` Moments play per scope (a game end is never capped). */
  scope: string;
  /** The full version; resolve when it has finished. */
  play: (ctx: MomentCtx) => void | Promise<void>;
  /** The still version for reduced motion; left out, nothing is drawn, but the sound and haptic still play. */
  reduced?: (ctx: MomentCtx) => void | Promise<void>;
  /** A sound name plays under the platform setting; a function plays it some other way (Spades' own mode). */
  sound?: SoundName | (() => void);
  haptic?: Haptic;
}

export type PushResult = 'playing' | 'queued' | 'duplicate' | 'capped';

export interface QueueOpts {
  /** Moments per scope; two per hand or round (§2.1). */
  cap?: number;
  reduced?: () => boolean;
  playSound?: (name: SoundName, tier: SoundTier) => void;
  vibrate?: (p: Haptic) => void;
}

const GRACE_MS = 500;
const SEEN_MAX = 500;
// Ids already played, for the page's life: a screen that remounts (a reconnect, a game reopened) never replays one.
const seen = new Set<string>();
/** Forgets which moments played (tests). */
export const forgetMoments = () => seen.clear();
const ceiling = (m: MomentSpec) =>
  (m.priority >= PRIORITY.gameEnd ? GAME_END_MAX_MS : MOMENT_MAX_MS) + GRACE_MS;

/**
 * Plays moments one at a time by priority, at most `cap` a scope, each once. Moments pushed in the same tick are
 * ordered before the first starts. Pure (no React): `MomentsProvider` hands one to a screen.
 */
export class MomentQueue {
  private pending: { m: MomentSpec; n: number }[] = [];
  private counts = new Map<string, number>();
  private now: { m: MomentSpec; ac: AbortController; end: () => void } | null = null;
  private subs = new Set<() => void>();
  private order = 0;
  private scheduled = false;
  private readonly cap: number;
  private readonly isReduced: () => boolean;
  private readonly sound: (name: SoundName, tier: SoundTier) => void;
  private readonly buzz: (p: Haptic) => void;

  constructor(o: QueueOpts = {}) {
    this.cap = o.cap ?? 2;
    this.isReduced = o.reduced ?? reducedMotion;
    this.sound = o.playSound ?? cue;
    this.buzz = o.vibrate ?? vibrate;
  }

  /** The Moment on screen now (Beats and Ticks are never "current"). */
  get current(): MomentSpec | null {
    return this.now?.m ?? null;
  }

  subscribe = (f: () => void) => {
    this.subs.add(f);
    return () => {
      this.subs.delete(f);
    };
  };

  push(m: MomentSpec): PushResult {
    if (seen.has(m.id)) return 'duplicate';
    seen.add(m.id);
    if (seen.size > SEEN_MAX) seen.delete(seen.values().next().value as string);
    if (m.tier !== 'moment') {
      void this.run(m, new AbortController());
      return 'playing';
    }
    if (this.capped(m)) return 'capped';
    this.pending.push({ m, n: this.order++ });
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => {
        this.scheduled = false;
        this.next();
      });
    }
    return 'queued';
  }

  /** Ends the Moment on screen (the tap layer); the next one starts. */
  skip() {
    this.now?.end();
  }

  /**
   * Drops everything waiting and ends the current one: the screen is going away. What never started is forgotten,
   * so the screen coming back (a remount, StrictMode's double mount) can push it again.
   */
  clear() {
    for (const { m } of this.pending) seen.delete(m.id);
    this.pending = [];
    this.skip();
  }

  private capped(m: MomentSpec) {
    return m.priority < PRIORITY.gameEnd && (this.counts.get(m.scope) ?? 0) >= this.cap;
  }

  private next() {
    if (this.now) return;
    this.pending.sort((a, b) => b.m.priority - a.m.priority || a.n - b.n);
    let item = this.pending.shift();
    while (item && this.capped(item.m)) item = this.pending.shift();
    if (!item) return;
    const { m } = item;
    this.counts.set(m.scope, (this.counts.get(m.scope) ?? 0) + 1);
    const ac = new AbortController();
    let end = () => undefined as void;
    const over = new Promise<void>((r) => (end = r));
    // Abort only a moment cut short: one that finished keeps its last frame (a stamp stays down).
    const stop = () => {
      ac.abort();
      end();
    };
    this.now = { m, ac, end: stop };
    this.emit();
    const timer = setTimeout(stop, ceiling(m));
    void Promise.race([this.run(m, ac), over]).then(() => {
      clearTimeout(timer);
      this.now = null;
      this.emit();
      this.next();
    });
  }

  private async run(m: MomentSpec, ac: AbortController) {
    if (typeof m.sound === 'function') m.sound();
    else if (m.sound) this.sound(m.sound, m.tier);
    if (m.haptic) this.buzz(m.haptic);
    try {
      await (this.isReduced() ? m.reduced : m.play)?.({ signal: ac.signal });
    } catch {
      /* a moment that fails is simply over */
    }
  }

  private emit() {
    this.subs.forEach((f) => f());
  }
}

const Ctx = createContext<MomentQueue | null>(null);

/** One queue for a screen (a game's table or board), with the tap layer that skips a Moment. */
export function MomentsProvider({
  children,
  queue,
}: {
  children: ReactNode;
  /** A queue made elsewhere (tests, the lab); one is made otherwise. */
  queue?: MomentQueue;
}) {
  const [q] = useState(() => queue ?? new MomentQueue());
  useEffect(() => {
    armAudio();
    return () => q.clear();
  }, [q]);
  return (
    <Ctx.Provider value={q}>
      {children}
      <MomentSkipLayer queue={q} />
    </Ctx.Provider>
  );
}

export function useMoments(): MomentQueue {
  const q = useContext(Ctx);
  if (!q) throw new Error('useMoments needs a MomentsProvider');
  return q;
}

/** The Moment on screen, for a screen that dims or holds something while it plays. */
export function useCurrentMoment(): MomentSpec | null {
  const q = useMoments();
  return useSyncExternalStore(q.subscribe, () => q.current);
}

/** While a Moment holds the screen, a tap anywhere or Escape skips it; Beats leave the table to the players. */
function MomentSkipLayer({ queue }: { queue: MomentQueue }) {
  const cur = useSyncExternalStore(queue.subscribe, () => queue.current);
  useEffect(() => {
    if (!cur) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && queue.skip();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [cur, queue]);
  if (!cur) return null;
  return (
    <button
      type="button"
      aria-label={s.skip}
      onClick={() => queue.skip()}
      className="fixed inset-0 z-[70] cursor-pointer bg-transparent"
    />
  );
}
