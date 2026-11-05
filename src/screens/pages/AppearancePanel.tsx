import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { agoTxt } from '@/lib/format';
import { useApp } from '@/state/store';
import {
  applyToEveryone,
  previewTheme,
  restoreAppearance,
  themeLabel,
  useThemeState,
} from '@/state/theme';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { Section } from '@/components/ui/Page';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ToggleTrack } from '@/components/ui/Toggle';
import { PRESS, SPRING } from '@/components/ui/motion';
import { loadAllThemeCss } from '@/theme/themeCss';
import { THEME_IDS, type Appearance, type ThemeId } from '@/theme/themes';
import { seatColor } from '@/theme/palette';
import { COLORS } from '@/domain';
import { admin } from '@/strings/admin';
import { Edge } from '@/components/ui/Edge';

const ap = admin.appearance;

/**
 * A theme drawn small with its own real tokens and materials: the box carries `data-theme`, so nothing here can drift
 * from what the theme really looks like (DESIGN-SYSTEM.md, Switching themes).
 */
function ThemePreview({ id }: { id: ThemeId }) {
  return (
    <div
      data-theme={id}
      aria-hidden
      className="scr-bg relative h-[120px] w-[160px] shrink-0 overflow-hidden rounded-[var(--r-md)] shadow-[inset_0_0_0_1px_var(--hairline-2)]"
    >
      <div
        className="absolute left-[30px] top-[14px] h-[46px] w-[100px] rounded-[50%]"
        style={{ background: 'var(--m-felt)', boxShadow: 'var(--m-felt-shadow)' }}
      />
      {[
        [26, 26],
        [80, 6],
        [134, 26],
      ].map(([x, y], k) => (
        <span
          key={k}
          className="absolute h-[18px] w-[18px] rounded-full"
          style={{
            left: x - 9,
            top: y + 2,
            background: seatColor(COLORS[k]),
            boxShadow: 'var(--m-av-shadow)',
          }}
        />
      ))}
      <div className="absolute left-[12px] right-[12px] top-[70px] grid grid-cols-4 gap-[5px]">
        {[0, 1, 2, 3].map((k) => (
          <span
            key={k}
            className="grid h-[20px] place-items-center rounded-[var(--r-sm)] font-display text-[11px]"
            style={
              k === 1
                ? { background: 'var(--m-on)', color: 'var(--on-brand)' }
                : { background: 'var(--m-key)', boxShadow: 'var(--m-key-shadow)' }
            }
          >
            {k}
          </span>
        ))}
      </div>
      {/* Each theme's own card back, from its --m-back token (nested themes can't use the material classes). */}
      <span
        className="absolute right-[4px] top-[4px] h-[20px] w-[14px] rotate-[8deg] rounded-[2px] shadow-[0_2px_4px_color-mix(in_srgb,var(--shade)_40%,transparent)]"
        style={{ background: 'var(--m-back)' }}
      />
      <div
        className="absolute bottom-[8px] left-[12px] right-[12px] h-[14px]"
        style={{
          background: 'var(--m-btn)',
          boxShadow: 'var(--m-btn-shadow)',
          borderRadius: 'var(--m-r)',
        }}
      />
    </div>
  );
}

/** Admin › Appearance: the theme everyone gets, previewed live, applied without a reload, with Undo. */
export function AppearancePanel() {
  const { state } = useApp();
  const th = useThemeState();
  const current = th.appearance?.theme ?? th.shown;
  const [pick, setPick] = useState<ThemeId>(current);
  const [allow, setAllow] = useState(!!th.appearance?.allowUserOverride);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ msg: string; previous: Appearance | null } | null>(null);
  const who = state.session?.player?.displayName ?? state.session?.user.email ?? '';
  const roving = useRovingFocus({ selected: THEME_IDS.indexOf(pick) });
  // A preview never outlives the Admin page.
  useEffect(() => () => previewTheme(null), []);
  // The previews draw every theme side by side, so each needs its own stylesheet.
  useEffect(() => void loadAllThemeCss(), []);
  // Undo stays on screen for 8 seconds (DESIGN-SYSTEM.md, Switching themes).
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(null), 8000);
    return () => clearTimeout(id);
  }, [done]);
  const apply = async () => {
    setBusy(true);
    const r = await applyToEveryone(pick, allow, who);
    setBusy(false);
    setDone({
      msg: (r.saved === 'everyone' ? ap.applied : ap.appliedHere)(themeLabel(pick)),
      previous: r.previous,
    });
  };
  const undo = async () => {
    const prev = done?.previous ?? null;
    setDone(null);
    await restoreAppearance(prev, who);
    setPick(prev?.theme ?? 'sunset-glass');
    setAllow(!!prev?.allowUserOverride);
  };
  const notice = th.remote === 'offline' ? ap.offline : th.remote === 'ok' ? null : ap.deviceOnly;
  const changed = th.appearance?.updatedAt ? Date.parse(th.appearance.updatedAt) : NaN;
  return (
    <div className="flex flex-col gap-4 pb-28">
      <Section title={ap.title}>
        <p className="mb-3 text-15 text-[var(--tx2)]">{ap.body}</p>
        <div
          role="radiogroup"
          aria-label={ap.title}
          {...roving.group}
          className="flex flex-col gap-2"
        >
          {THEME_IDS.map((id, i) => (
            <m.button
              key={id}
              type="button"
              role="radio"
              aria-checked={pick === id}
              {...roving.item(i)}
              whileTap={PRESS}
              transition={SPRING}
              onClick={() => setPick(id)}
              className="glass relative flex items-center gap-3 p-2 text-left"
            >
              {pick === id && <Edge tone="brand" />}
              <ThemePreview id={id} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-17 font-bold">{themeLabel(id)}</span>
                {current === id && (
                  <span className="mono-label text-[0.6875rem] text-[var(--tx2)]">
                    {ap.current}
                  </span>
                )}
              </span>
              <span
                aria-hidden
                className={`mr-2 grid h-6 w-6 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_2px_var(--tx2)] ${pick === id ? '!shadow-[inset_0_0_0_7px_var(--brand)]' : ''}`}
              />
            </m.button>
          ))}
        </div>
      </Section>
      <m.button
        type="button"
        role="switch"
        aria-checked={allow}
        onClick={() => setAllow((v) => !v)}
        whileTap="press"
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-1 text-left"
      >
        <span className="flex flex-col">
          <span className="text-16 font-medium">{ap.allow}</span>
          <span className="text-14 text-[var(--tx2)]">{ap.allowHint}</span>
        </span>
        <ToggleTrack on={allow} />
      </m.button>
      {notice && (
        <p role="note" className="text-14 text-[var(--warn)]">
          {notice}
        </p>
      )}
      {th.preview && (
        <p className="text-14 text-[var(--tx2)]">{ap.previewing(themeLabel(th.preview))}</p>
      )}
      <div className="flex flex-col gap-2">
        <PrimaryButton
          tone="glass"
          className="mat-sm w-full"
          onClick={() => previewTheme(th.preview === pick ? null : pick)}
        >
          {th.preview === pick ? ap.stopPreview : ap.preview}
        </PrimaryButton>
        <PrimaryButton className="w-full" disabled={busy} onClick={() => void apply()}>
          {ap.apply}
        </PrimaryButton>
      </div>
      {th.appearance?.updatedBy && !Number.isNaN(changed) && (
        <p className="text-13 text-[var(--tx2)]">
          {ap.last(th.appearance.updatedBy, agoTxt(changed))}
        </p>
      )}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+var(--sab))] z-[66] flex justify-center px-4"
      >
        <AnimatePresence>
          {done && (
            <m.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              transition={SPRING}
              className="mat-toast pointer-events-auto flex min-h-11 max-w-full items-center gap-1 rounded-full pl-4 pr-1 text-15 font-semibold"
            >
              <span className="py-1.5">{done.msg}</span>
              <button
                type="button"
                onClick={() => void undo()}
                className="mat-toast-act press min-h-11 shrink-0 rounded-full px-3 font-extrabold"
              >
                {ap.undo}
              </button>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
