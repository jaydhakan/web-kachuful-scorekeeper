import { useEffect, useMemo, useState } from 'react';
import { Avatar, type Face } from '@/components/ui/Avatar';
import { Seg } from '@/components/ui/Seg';
import { COLORS } from '@/people/avatars';
import { wardrobe as w } from '@/strings/wardrobe';
import { applyTheme } from '@/theme/applyTheme';
import { loadAllThemeCss } from '@/theme/themeCss';
import { THEMES, type ThemeId } from '@/theme/themes';
import { artOf } from '@/wardrobe/art';
import { ITEMS } from '@/wardrobe/catalog';
import { StageBust } from '@/wardrobe/StageBust';
import { SLOTS, type Look, type Slot } from '@/wardrobe/types';

/**
 * The Wardrobe's style sheet (`/?lab=moments&tab=wardrobe`, dev only; REWARDS-FINISH R0): every drawn item on the bust
 * at the sizes the app draws avatars (dot 26, seat 32, hero 52, stage 72, the Wardrobe's 220), in one theme or all
 * four side by side, and a look picker to try combinations.
 */
const SIZES = [26, 32, 52, 72] as const;
const THEME_IDS = Object.keys(THEMES) as ThemeId[];
const FACE = { emoji: '🦊', color: COLORS[0] };
const drawn = ITEMS.filter((i) => artOf(i.slot, i.id));

const SHEET: { label: string; look: Look }[] = [
  { label: 'Bust only', look: {} },
  ...drawn.map((i) => ({ label: w.name(i.id), look: { [i.slot]: { id: i.id, v: 0 } } })),
  {
    label: 'Kurta, safa, gold ring',
    look: {
      outfit: { id: 'kurta', v: 4 },
      headwear: { id: 'safa', v: 0 },
      frame: { id: 'gold_ring', v: 0 },
    },
  },
];

function Row({ label, face, pip }: { label: string; face: Face; pip: string | undefined }) {
  return (
    <div className="flex flex-wrap items-end gap-4 border-b border-ov/10 py-3">
      <span className="w-40 text-14 font-bold">{label}</span>
      {SIZES.map((px) => (
        <figure key={px} className="flex flex-col items-center gap-1">
          <Avatar
            p={face}
            pip={pip}
            className="grid shrink-0 place-items-center rounded-full"
            style={{ width: px, height: px, fontSize: px * 0.56 }}
          />
          <figcaption className="text-12 text-[var(--tx2)]">{px}</figcaption>
        </figure>
      ))}
      <figure className="flex flex-col items-center gap-1">
        <StageBust p={face} size={220} pip={pip} />
        <figcaption className="text-12 text-[var(--tx2)]">220 stage</figcaption>
      </figure>
    </div>
  );
}

function Sheet({ look, pip }: { look: Look; pip: string | undefined }) {
  return (
    <div>
      <Row label="Your look" face={{ ...FACE, look }} pip={pip} />
      {SHEET.map((r) => (
        <Row key={r.label} label={r.label} face={{ ...FACE, look: r.look }} pip={pip} />
      ))}
      <h3 className="mono-label mt-4 text-12 text-[var(--tx2)]">Variants</h3>
      {drawn
        .filter((i) => i.variants > 1)
        .map((i) => (
          <div key={i.id} className="flex flex-wrap items-center gap-3 py-2">
            <span className="w-40 text-14">{w.name(i.id)}</span>
            {Array.from({ length: i.variants }, (_, v) => (
              <StageBust key={v} p={{ ...FACE, look: { [i.slot]: { id: i.id, v } } }} size={96} />
            ))}
          </div>
        ))}
    </div>
  );
}

function Picker({ look, onChange }: { look: Look; onChange: (l: Look) => void }) {
  const set = (slot: Slot, id: string, v = 0) => {
    const next = { ...look };
    if (id) next[slot] = { id, v };
    else delete next[slot];
    onChange(next);
  };
  return (
    <div className="flex flex-wrap gap-3">
      {SLOTS.filter((s) => s !== 'title').map((slot) => {
        const cur = look[slot],
          item = ITEMS.find((i) => i.id === cur?.id);
        return (
          <label key={slot} className="flex flex-col gap-1 text-12">
            {w.slot[slot]} · {w.slotPlain[slot]}
            <span className="flex gap-1">
              <select
                value={cur?.id ?? ''}
                onChange={(e) => set(slot, e.target.value)}
                className="mat-inp min-h-11 rounded-xl px-2 text-14"
              >
                <option value="">None</option>
                {ITEMS.filter((i) => i.slot === slot).map((i) => (
                  <option key={i.id} value={i.id}>
                    {w.name(i.id)}
                    {artOf(slot, i.id) ? '' : ' (not drawn)'}
                  </option>
                ))}
              </select>
              {item && item.variants > 1 && (
                <select
                  aria-label={`${w.slotPlain[slot]} colour`}
                  value={cur?.v ?? 0}
                  onChange={(e) => set(slot, item.id, Number(e.target.value))}
                  className="mat-inp min-h-11 rounded-xl px-2 text-14"
                >
                  {Array.from({ length: item.variants }, (_, v) => (
                    <option key={v} value={v}>
                      Colour {v + 1}
                    </option>
                  ))}
                </select>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export default function WardrobeLab() {
  const [theme, setTheme] = useState<ThemeId | 'all'>(
    () => (document.documentElement.getAttribute('data-theme') as ThemeId) ?? 'sunset-glass',
  );
  const [look, setLook] = useState<Look>(SHEET[SHEET.length - 1].look);
  const [pip, setPip] = useState<'off' | 'on'>('off');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (theme === 'all') void loadAllThemeCss().then(() => setReady(true));
    else void applyTheme(theme, { persist: false, animate: false });
  }, [theme]);
  const glyph = pip === 'on' ? '👑' : undefined;
  const themes = useMemo(() => (theme === 'all' ? THEME_IDS : [theme]), [theme]);

  return (
    <div className="flex flex-col gap-4 p-4 text-[var(--tx)]">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="disp mr-4 text-24 font-extrabold">Wardrobe style sheet</h1>
        <label className="flex items-center gap-2 text-14">
          Theme
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeId | 'all')}
            className="mat-inp min-h-11 rounded-xl px-3"
          >
            {THEME_IDS.map((t) => (
              <option key={t} value={t}>
                {THEMES[t].label}
              </option>
            ))}
            <option value="all">All four</option>
          </select>
        </label>
        <Seg
          uid="lab-pip"
          label="Pip"
          size="sm"
          value={pip}
          onChange={setPip}
          options={[
            { v: 'off', label: 'No pip' },
            { v: 'on', label: 'Pip' },
          ]}
        />
      </div>
      <Picker look={look} onChange={setLook} />
      {theme === 'all' && !ready ? (
        <p className="text-14">Loading the themes…</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto">
          {themes.map((t) => (
            <section
              key={t}
              data-theme={theme === 'all' ? t : undefined}
              className="min-w-max rounded-2xl bg-[var(--bg)] p-4 text-[var(--tx)]"
            >
              <h2 className="mono-label mb-2 text-12">{THEMES[t].label}</h2>
              <Sheet look={look} pip={glyph} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
