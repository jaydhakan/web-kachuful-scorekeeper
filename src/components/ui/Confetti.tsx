import { useEffect, useRef } from 'react';

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
    const w = p.clientWidth,
      h = p.clientHeight,
      dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * dpr;
    c.height = h * dpr;
    x.scale(dpr, dpr);
    const P = Array.from({ length: 150 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 80,
      y: h * 0.3,
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
      x.clearRect(0, 0, w, h);
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
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-[55]" />;
}
