import { useEffect, useRef } from 'react';
import { confettiCount } from '@/lib/confettiCount';

interface ConfettiProps {
  colors: string[];
  onDone?: () => void;
}

/** Canvas confetti in the avatar colours; never takes pointer events. */
export function Confetti({ colors, onDone }: ConfettiProps) {
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
    // The burst starts at the podium when the screen has one, else high and centred.
    const pr = p.getBoundingClientRect(),
      pod = document.querySelector('[data-podium]')?.getBoundingClientRect();
    const ox = pod ? pod.left + pod.width / 2 - pr.left : size.w / 2,
      oy = pod ? pod.top + pod.height / 2 - pr.top : size.h * 0.3;
    const P = Array.from({ length: confettiCount(size.w, size.h) }, () => ({
      x: ox + (Math.random() - 0.5) * 80,
      y: oy,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 13 - 3,
      r: Math.random() * 6 + 3,
      c: colors[(Math.random() * colors.length) | 0],
      a: Math.random() * 6,
      va: (Math.random() - 0.5) * 0.4,
    }));
    const t0 = performance.now();
    let raf = 0;
    const f = (t: number) => {
      const k = (t - t0) / 2500;
      if (k >= 1) {
        onDone?.();
        return;
      }
      x.clearRect(0, 0, size.w, size.h);
      P.forEach((q) => {
        q.vy += 0.35;
        q.x += q.vx;
        q.y += q.vy;
        q.vx *= 0.99;
        q.a += q.va;
        x.save();
        x.globalAlpha = Math.min(1, (1 - k) * 2);
        x.translate(q.x, q.y);
        x.rotate(q.a);
        x.fillStyle = q.c;
        x.fillRect(-q.r, -q.r / 2, q.r * 2, q.r);
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
