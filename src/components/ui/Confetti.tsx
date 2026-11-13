import { useEffect, useRef } from 'react';
import { confettiCount, MAX_STEP_MS, stepConfetti, type ConfettiPiece } from '@/lib/confettiCount';
import { colorValue } from '@/theme/palette';
import { reveal } from './podiumReveal';

interface ConfettiProps {
  colors: string[];
  onDone?: () => void;
  /**
   * Where the burst starts: an element (its centre) or a point in the viewport. Left out, it waits for a staged
   * podium to name its winner and starts at their avatar, else at the podium, else high and centred.
   */
  origin?: Element | { x: number; y: number } | null;
}

const LIFE_MS = 2800;
/** How long to wait for a winner screen still loading, and for a reveal that never reports back. */
const MOUNT_GRACE_MS = 500;
const REVEAL_CAP_MS = 8000;

/** Canvas confetti in the avatar colours; never takes pointer events. */
export function Confetti({ colors, onDone, origin }: ConfettiProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current,
      p = c?.parentElement,
      x = c?.getContext('2d');
    if (!c || !p || !x) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = { w: 0, h: 0 };
    // Setting width resets the context, so the scale is applied again every time; particles are untouched.
    const fit = () => {
      size.w = p.clientWidth;
      size.h = p.clientHeight;
      c.width = size.w * dpr;
      c.height = size.h * dpr;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    ro?.observe(p);
    // Saved player colours and theme tokens, as the canvas needs them: concrete values in the active theme.
    const cs = colors.map((k) => colorValue(k));
    type Piece = ConfettiPiece & { r: number; c: string };
    let P: Piece[] = [];
    const launch = () => {
      const pr = p.getBoundingClientRect(),
        el =
          origin instanceof Element
            ? origin
            : origin
              ? null
              : (document.querySelector('[data-confetti-origin]') ??
                document.querySelector('[data-podium]')),
        b = el?.getBoundingClientRect();
      const at = b
        ? { x: b.left + b.width / 2, y: b.top + b.height / 2 }
        : origin && !(origin instanceof Element)
          ? origin
          : { x: pr.left + size.w / 2, y: pr.top + size.h * 0.3 };
      P = Array.from({ length: confettiCount(size.w, size.h) }, () => ({
        x: at.x - pr.left + (Math.random() - 0.5) * 80,
        y: at.y - pr.top,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 13 - 3,
        r: Math.random() * 6 + 3,
        c: cs[(Math.random() * cs.length) | 0],
        a: Math.random() * 6,
        va: (Math.random() - 0.5) * 0.4,
        ph: Math.random() * 6,
        vph: 0.12 + Math.random() * 0.2,
      }));
    };
    const t0 = performance.now();
    let raf = 0,
      last = 0,
      age = -1;
    const f = (t: number) => {
      if (age < 0) {
        // A staged podium is still revealing, or the winner screen (a lazy chunk) has not drawn its podium yet.
        const waited = t - t0,
          ph = origin ? 'done' : reveal.get();
        const hold =
          (ph === 'running' && waited < REVEAL_CAP_MS) ||
          (ph === 'idle' && waited < MOUNT_GRACE_MS && !document.querySelector('[data-steps]'));
        if (hold) {
          raf = requestAnimationFrame(f);
          return;
        }
        launch();
        age = 0;
        last = t;
      }
      // The life runs on the same clamped clock as the flight, so a background tab pauses both.
      const dt = Math.min(t - last, MAX_STEP_MS);
      last = t;
      age += dt;
      const k = age / LIFE_MS;
      if (k >= 1) {
        x.clearRect(0, 0, size.w, size.h);
        onDone?.();
        return;
      }
      x.clearRect(0, 0, size.w, size.h);
      x.globalAlpha = Math.min(1, (1 - k) * 2.5);
      P.forEach((q) => {
        stepConfetti(q, dt);
        // Flutter: the piece narrows to an edge and widens again as it turns over.
        const w = Math.max(0.12, Math.abs(Math.cos(q.ph)));
        x.save();
        x.translate(q.x, q.y);
        x.rotate(q.a);
        x.fillStyle = q.c;
        x.fillRect(-q.r * w, -q.r / 2, q.r * 2 * w, q.r);
        x.restore();
      });
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-[55]" />;
}
