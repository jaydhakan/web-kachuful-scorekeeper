import type { ReactElement } from 'react';
import { nextSoundLevel, useFxPrefs, type SoundLevel } from '@/fx/prefs';
import { fx as s } from '@/strings/fx';
import { RailItem } from '@/components/desk/RailItem';
import { MenuRow } from './MenuRows';

const NAME: Record<SoundLevel, string> = {
  all: s.soundsAll,
  moments: s.soundsMoments,
  off: s.soundsOff,
};

const glyph = (level: SoundLevel): ReactElement => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className="h-6 w-6"
  >
    <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" />
    {level === 'all' && <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />}
    {level === 'moments' && <path d="M15.5 9a4 4 0 0 1 0 6" />}
    {level === 'off' && <path d="M16 9.5l5 5M21 9.5l-5 5" />}
  </svg>
);

/**
 * The speaker button: cycles this device's Sounds (All, Big moments, Off) in the one shared setting, so nobody walks
 * to the Me page to quieten a table. `onToast` is the game's own toast, told what it switched to.
 */
function useQuickMute(onToast: (message: string) => void) {
  const [{ sounds }, set] = useFxPrefs();
  return {
    sounds,
    cycle: () => {
      const next = nextSoundLevel(sounds);
      set({ sounds: next });
      onToast(s.quick.toast(NAME[next]));
    },
  };
}

/** The row in a game's menu sheet. */
export function SoundRow({
  i,
  rule,
  onToast,
}: {
  i: number;
  rule: boolean;
  onToast: (message: string) => void;
}) {
  const { sounds, cycle } = useQuickMute(onToast);
  return (
    <MenuRow
      i={i}
      rule={rule}
      icon={glyph(sounds)}
      label={s.quick.label(NAME[sounds])}
      onClick={cycle}
    />
  );
}

/** The item on the desk rail: the same icon-over-label size as its neighbours. */
export function SoundRailButton({ onToast }: { onToast: (message: string) => void }) {
  const { sounds, cycle } = useQuickMute(onToast);
  return (
    <RailItem
      icon={glyph(sounds)}
      label={s.sounds}
      ariaLabel={`${s.quick.label(NAME[sounds])}, ${s.quick.hint}`}
      onClick={cycle}
    />
  );
}
