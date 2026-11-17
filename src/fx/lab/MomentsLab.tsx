import './lab.css';
import { MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Seg } from '@/components/ui/Seg';
import { applyTheme } from '@/theme/applyTheme';
import { THEMES, type ThemeId } from '@/theme/themes';
import { forgetMoments, MomentsProvider } from '../moments';
import { armAudio } from '../sound';
import { forceReducedMotion, setTimeScale } from '../waapi';
import { ENTRIES } from './entries';

type Speed = '1' | '0.25';
type Size = 'phone' | 'desk';
const SIZES: Record<Size, { w: number; h: number }> = {
  phone: { w: 390, h: 844 },
  desk: { w: 1280, h: 800 },
};

/**
 * The moments lab (`/?lab=moments`, dev builds only): every moment with Replay, 0.25× speed, reduced motion on and
 * off, the four themes, and phone and desk sizes. Where a moment's feel is approved, and what e2e screenshots.
 */
export default function MomentsLab() {
  const [id, setId] = useState(
    () => new URLSearchParams(location.search).get('m') ?? ENTRIES[0].id,
  );
  const [run, setRun] = useState(0);
  const [speed, setSpeed] = useState<Speed>('1');
  const [reduced, setReduced] = useState<'off' | 'on'>(() =>
    matchMedia('(prefers-reduced-motion: reduce)').matches ? 'on' : 'off',
  );
  const [size, setSize] = useState<Size>('phone');
  const [theme, setTheme] = useState<ThemeId>(
    () => (document.documentElement.getAttribute('data-theme') as ThemeId) ?? 'sunset-glass',
  );
  const entry = ENTRIES.find((e) => e.id === id) ?? ENTRIES[0];

  useEffect(() => {
    // Framer's own animations run on Web Animations where they can; the sweep slows those too.
    setTimeScale(Number(speed));
    let raf = 0;
    const sweep = () => {
      for (const a of document.getAnimations?.() ?? [])
        if (a.playbackRate !== Number(speed)) a.playbackRate = Number(speed);
      raf = requestAnimationFrame(sweep);
    };
    if (speed !== '1') raf = requestAnimationFrame(sweep);
    return () => {
      cancelAnimationFrame(raf);
      setTimeScale(1);
    };
  }, [speed]);
  useEffect(() => {
    forceReducedMotion(reduced === 'on');
    return () => forceReducedMotion(null);
  }, [reduced]);
  useEffect(() => void applyTheme(theme, { persist: false, animate: false }), [theme]);
  const replay = () => {
    armAudio();
    forgetMoments();
    setRun((n) => n + 1);
  };
  useEffect(() => {
    const u = new URL(location.href);
    u.searchParams.set('m', id);
    history.replaceState(null, '', u);
  }, [id]);

  const box = SIZES[size];
  return (
    <div className="grid min-h-dvh grid-cols-[15rem_minmax(0,1fr)] gap-6 bg-[var(--bg)] p-4 text-[var(--tx)]">
      <nav aria-label="Moments" className="flex flex-col gap-1">
        <h1 className="disp mb-2 text-24 font-extrabold">Moments lab</h1>
        {(['Foundations', 'Platform', 'Spades', 'Kaali Teeri', 'Ishaara'] as const).map((g) => (
          <section key={g} className="mb-2">
            <h2 className="mono-label mb-1 text-12 text-[var(--tx2)]">{g}</h2>
            {ENTRIES.filter((e) => e.group === g).map((e) => (
              <button
                key={e.id}
                type="button"
                data-lab-entry={e.id}
                aria-current={e.id === id || undefined}
                onClick={() => {
                  setId(e.id);
                  replay();
                }}
                className="press flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-15 aria-[current]:bg-ov/10 aria-[current]:font-bold"
              >
                {e.title}
                <span className="text-12 text-[var(--tx2)]">{e.tier}</span>
              </button>
            ))}
          </section>
        ))}
      </nav>
      <main className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-lab-replay
            onClick={replay}
            className="press min-h-11 rounded-full bg-[var(--accent)] px-5 font-bold text-ink-on-accent"
          >
            Replay
          </button>
          <Seg
            uid="lab-speed"
            label="Speed"
            size="sm"
            value={speed}
            onChange={setSpeed}
            options={[
              { v: '1', label: '1×' },
              { v: '0.25', label: '0.25×' },
            ]}
          />
          <Seg
            uid="lab-reduced"
            label="Reduced motion"
            size="sm"
            value={reduced}
            onChange={(v) => {
              setReduced(v);
              replay();
            }}
            options={[
              { v: 'off', label: 'Motion' },
              { v: 'on', label: 'Reduced' },
            ]}
          />
          <Seg
            uid="lab-size"
            label="Size"
            size="sm"
            value={size}
            onChange={setSize}
            options={[
              { v: 'phone', label: 'Phone' },
              { v: 'desk', label: 'Desk' },
            ]}
          />
          <label className="flex items-center gap-2 text-14">
            Theme
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeId)}
              className="mat-inp min-h-11 rounded-xl px-3"
            >
              {(Object.keys(THEMES) as ThemeId[]).map((t) => (
                <option key={t} value={t}>
                  {THEMES[t].label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {entry.note && <p className="max-w-[60ch] text-14 text-[var(--tx2)]">{entry.note}</p>}
        <div className="overflow-auto">
          {/* A transform makes the stage the containing block for fixed layers (a moment's skip layer, rain). */}
          <div
            data-lab-stage
            data-moment-root
            className="felt relative isolate overflow-hidden rounded-2xl border border-ov/15 [transform:translateZ(0)]"
            style={{ width: box.w, height: box.h, maxWidth: '100%' }}
          >
            <MotionConfig reducedMotion={reduced === 'on' ? 'always' : 'never'}>
              <MomentsProvider key={`${id}:${run}:${reduced}`}>
                <entry.Demo />
              </MomentsProvider>
            </MotionConfig>
          </div>
        </div>
      </main>
    </div>
  );
}
