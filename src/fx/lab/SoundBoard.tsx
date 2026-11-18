import { useEffect, useRef, useState } from 'react';
import { reducedMotion } from '../reduced';
import { scheduleCues, type CueRun } from '../sequence';
import { preview, SOUND_TIER, type SoundName, type SoundTier } from '../sound';
import { SEQUENCES } from './soundSequences';

const NEW: SoundName[] = [
  'flick',
  'chip',
  'knock',
  'hook',
  'made',
  'missed',
  'tally',
  'rise',
  'crown',
  'bell',
  'spin',
  'undo',
  'fanfare',
];
const OLD = (Object.keys(SOUND_TIER) as SoundName[]).filter((n) => !NEW.includes(n));
const TIER: Record<SoundTier, string> = { moment: 'moment', beat: 'beat', tick: 'tick' };

function SoundRow({ name, pitch }: { name: SoundName; pitch: number }) {
  return (
    <li className="flex min-h-11 items-center gap-3">
      <button
        type="button"
        data-sound={name}
        onClick={() => preview(name, { pitch })}
        className="press min-h-11 w-28 rounded-xl bg-ov/10 px-3 text-left font-bold"
      >
        ▶ {name}
      </button>
      <span className="mono-label w-16 text-12 text-[var(--tx2)]">{TIER[SOUND_TIER[name]]}</span>
    </li>
  );
}

/**
 * The Sound Board (`/?lab=moments&tab=sounds`, dev builds only): every sound with a play button and a pitch slider,
 * and each game's sequences played from the same cue plans the games use. Where the recipes get approved by ear.
 */
export default function SoundBoard() {
  const [pitch, setPitch] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const run = useRef<CueRun | null>(null);
  useEffect(() => () => run.current?.cancel(), []);
  const play = (i: number) => {
    run.current?.cancel();
    const { plan } = SEQUENCES[i];
    run.current = scheduleCues(plan, {
      reduced: reducedMotion(),
      play: (c) => preview(c.name, { pitch: c.pitch, gain: c.gain }),
    });
    setPlaying(SEQUENCES[i].title);
  };
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4 text-[var(--tx)]">
      <h1 className="disp text-24 font-extrabold">Sound Board</h1>
      <p className="max-w-[60ch] text-14 text-[var(--tx2)]">
        Plays whatever the Sounds setting says, so every button here plays. Audio unlocks on your
        first tap. The pitch slider shifts every button below it, so a made result can be tried a
        few notes up.
      </p>
      <label className="flex items-center gap-3 text-14">
        Pitch {pitch > 0 ? `+${pitch}` : pitch} semitones
        <input
          type="range"
          min={-12}
          max={12}
          step={1}
          value={pitch}
          onChange={(e) => setPitch(Number(e.target.value))}
          className="min-h-11 flex-1"
        />
      </label>
      <section>
        <h2 className="mono-label mb-1 text-12 text-[var(--tx2)]">New table sounds</h2>
        <ul>
          {NEW.map((n) => (
            <SoundRow key={n} name={n} pitch={pitch} />
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mono-label mb-1 text-12 text-[var(--tx2)]">Existing sounds</h2>
        <ul>
          {OLD.map((n) => (
            <SoundRow key={n} name={n} pitch={pitch} />
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mono-label mb-1 text-12 text-[var(--tx2)]">Sequences</h2>
        <ul>
          {(['Kachuful', 'Kaali Teeri', 'Shared'] as const).map((g) => (
            <li key={g} className="mb-2">
              <h3 className="text-14 font-bold">{g}</h3>
              {SEQUENCES.map((s, i) =>
                s.game !== g ? null : (
                  <button
                    key={s.title}
                    type="button"
                    data-sequence={s.title}
                    aria-current={playing === s.title || undefined}
                    onClick={() => play(i)}
                    className="press mr-2 mt-1 min-h-11 rounded-xl bg-ov/10 px-3 aria-[current]:bg-[var(--accent)] aria-[current]:text-ink-on-accent"
                  >
                    ▶ {s.title}
                  </button>
                ),
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
