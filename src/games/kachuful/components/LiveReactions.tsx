import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import type { ReactionKind } from '@/sync/types';
import { t } from '@/strings';

const lv = t.hub.live;

export const REACTIONS: [ReactionKind, string][] = [
  ['clap', '👏'],
  ['fire', '🔥'],
  ['laugh', '😂'],
  ['wow', '😱'],
  ['party', '🎉'],
];
const EMOJI = Object.fromEntries(REACTIONS) as Record<ReactionKind, string>;
const MAX_ON_SCREEN = 14;

export interface Burst {
  id: number;
  kind: ReactionKind;
  /** 0–1 across the lane, so a flurry spreads out instead of stacking. */
  x: number;
}

/** Reactions arriving over the stream, each kept on screen for its float and then dropped. */
export function useBursts() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const live = timers.current;
    return () => live.forEach(clearTimeout);
  }, []);
  const add = useCallback((kind: ReactionKind) => {
    const id = ++seq.current;
    setBursts((b) => [...b.slice(-(MAX_ON_SCREEN - 1)), { id, kind, x: Math.random() }]);
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setBursts((b) => b.filter((x) => x.id !== id));
    }, 2200);
    timers.current.add(timer);
  }, []);
  return [bursts, add] as const;
}

/** Cheers floating up a lane at the screen's edge; with reduced motion they fade in place. */
export function ReactionBurst({ bursts, className = '' }: { bursts: Burst[]; className?: string }) {
  const rm = useReducedMotion();
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed bottom-[calc(var(--sab)+6rem)] right-[max(0.75rem,var(--sar))] z-40 h-64 w-20 ${className}`}
    >
      <AnimatePresence>
        {bursts.map((b) => (
          <m.span
            key={b.id}
            initial={rm ? { opacity: 0 } : { opacity: 0, y: 0, scale: 0.6 }}
            animate={rm ? { opacity: [0, 1, 0] } : { opacity: [0, 1, 1, 0], y: -220, scale: 1 }}
            transition={{ duration: rm ? 1.6 : 2, ease: 'easeOut' }}
            className="absolute bottom-0 text-30"
            style={{ left: `${b.x * 60}%` }}
          >
            {EMOJI[b.kind]}
          </m.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** "4 watching": the scorer sees the table is followed; viewers see they're not alone. */
export function WatchersPill({ n, className = '' }: { n: number; className?: string }) {
  if (n < 1) return null;
  return (
    <span
      role="status"
      className={`glass inline-flex items-center gap-1.5 !rounded-full px-3 py-1 text-13 font-bold ${className}`}
    >
      <span aria-hidden>👀</span>
      {lv.watching(n)}
    </span>
  );
}

/** The five cheers a spectator can send; the server limits the pace, and a refusal just pauses the bar. */
export function ReactionBar({ token, onOff }: { token: string; onOff: () => void }) {
  const [wait, setWait] = useState(false);
  const [note, setNote] = useState('');
  const send = async (kind: ReactionKind) => {
    if (wait) return;
    setWait(true);
    setNote('');
    try {
      await ep.react(token, kind);
      setNote(lv.sent(lv.reactions[kind]));
    } catch (e) {
      if (e instanceof ApiError && e.code === 'reactions_off') onOff();
      else if (e instanceof ApiError && e.status === 429) setNote(lv.slowDown);
    } finally {
      setTimeout(() => setWait(false), 1000);
    }
  };
  return (
    <section aria-label={lv.react} className="glass mb-5 p-3">
      <h2 className="mb-2 px-1 text-13 font-bold uppercase tracking-[0.12em] text-[var(--tx2)]">
        {lv.react}
      </h2>
      <div className="grid grid-cols-5 gap-2">
        {REACTIONS.map(([kind, emoji]) => (
          <button
            key={kind}
            type="button"
            aria-label={lv.reactions[kind]}
            aria-disabled={wait}
            onClick={() => void send(kind)}
            className="press grid min-h-12 place-items-center rounded-2xl bg-ov/[.06] text-26 aria-disabled:opacity-50"
          >
            <span aria-hidden>{emoji}</span>
          </button>
        ))}
      </div>
      <p role="status" className="mt-2 min-h-5 px-1 text-13 text-[var(--tx2)]">
        {note}
      </p>
    </section>
  );
}
