import { m } from 'framer-motion';
import { useId } from 'react';
import { Section } from '@/components/ui/PageParts';
import { Seg } from '@/components/ui/Seg';
import { ToggleTrack } from '@/components/ui/Toggle';
import { useFxPrefs } from '@/fx/prefs';
import { fx as s } from '@/strings/fx';

/** This device's Sounds (All / Big moments / Off) and Vibration, for every game. */
export function FxSettings() {
  const [prefs, set] = useFxPrefs();
  const uid = useId();
  return (
    <Section title={s.title}>
      <div className="glass flex flex-col gap-4 p-4">
        <div>
          <p className="mb-2 text-15 font-bold">{s.sounds}</p>
          <Seg
            uid={`${uid}-seg`}
            label={s.sounds}
            value={prefs.sounds}
            onChange={(v) => set({ sounds: v })}
            options={[
              { v: 'all', label: s.soundsAll },
              { v: 'moments', label: s.soundsMoments },
              { v: 'off', label: s.soundsOff },
            ]}
          />
          <p className="mt-2 text-14 text-[var(--tx2)]">
            {s.soundsNote[prefs.sounds]} {s.spadesNote}
          </p>
        </div>
        <m.button
          type="button"
          role="switch"
          aria-checked={prefs.vibrate}
          onClick={() => set({ vibrate: !prefs.vibrate })}
          whileTap="press"
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl text-left"
        >
          <span className="flex flex-col">
            <span className="text-15 font-bold">{s.vibrate}</span>
            <span className="text-14 text-[var(--tx2)]">{s.vibrateHint}</span>
          </span>
          <ToggleTrack on={prefs.vibrate} />
        </m.button>
      </div>
    </Section>
  );
}
