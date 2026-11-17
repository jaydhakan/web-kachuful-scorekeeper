import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Confetti } from '@/components/ui/Confetti';
import { Stamp } from '@/fx/ui';
import { palette } from '@/theme/palette';
import { PRIORITY, useMoments } from '../moments';
import { cue, SOUND_TIER, type SoundName } from '../sound';
import { sheen, stamp } from '../stamp';
import { anim, OUT, wait } from '../waapi';
import type { LabEntry } from './registry';

function StampDemo() {
  const a = useRef<HTMLSpanElement>(null),
    b = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const x = stamp(a.current);
    const y = stamp(b.current, { delay: 600, angle: 6 });
    return () => {
      x.cancel();
      y.cancel();
    };
  }, []);
  return (
    <div className="grid h-full place-items-center gap-6">
      <Stamp ref={a} className="text-28">
        SET −40
      </Stamp>
      <Stamp ref={b} tone="gold" className="text-36">
        BOSTON
      </Stamp>
    </div>
  );
}

function SheenDemo() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => sheen(ref.current, { delay: 300 }).cancel, []);
  return (
    <div className="grid h-full place-items-center">
      <div ref={ref} className="glass relative grid h-48 w-72 place-items-center rounded-3xl">
        <span className="disp text-28 font-extrabold">Winner</span>
      </div>
    </div>
  );
}

function ConfettiDemo() {
  const [on, setOn] = useState(true);
  return (
    <div className="grid h-full place-items-center">
      <span data-confetti-origin className="text-48">
        🏆
      </span>
      {on && (
        <Confetti
          colors={[palette['gold-light'], palette['accent-hearts'], palette['accent-diamonds']]}
          count={80}
          onDone={() => setOn(false)}
        />
      )}
    </div>
  );
}

const SOUNDS = Object.keys(SOUND_TIER) as SoundName[];
function SoundsDemo() {
  return (
    <div className="flex flex-wrap content-start gap-2 p-4">
      {SOUNDS.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => cue(n, 'moment')}
          className="press min-h-11 rounded-full bg-ov/10 px-4 text-14 font-bold"
        >
          {n} <span className="text-12 font-normal text-[var(--tx2)]">{SOUND_TIER[n]}</span>
        </button>
      ))}
    </div>
  );
}

/** Three Moments in one scope and a game end: the queue plays the game end first, then one more (the cap is two). */
function QueueDemo() {
  const q = useMoments();
  const [log, setLog] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const show = (label: string) => async () => {
      setLog((l) => [...l, label]);
      const el = ref.current;
      await anim(
        el,
        [
          { opacity: 0, transform: 'scale(.9)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        {
          duration: 300,
          easing: OUT,
          fill: 'both',
        },
      ).done;
      await wait(700);
    };
    const base = { tier: 'moment' as const, scope: 'hand-1' };
    q.push({
      ...base,
      id: 'lab:small',
      priority: PRIORITY.smallUnlock,
      play: show('small unlock'),
    });
    q.push({ ...base, id: 'lab:big', priority: PRIORITY.bigUnlock, play: show('big unlock') });
    q.push({ ...base, id: 'lab:boston', priority: PRIORITY.verdict, play: show('Boston') });
    q.push({ ...base, id: 'lab:end', priority: PRIORITY.gameEnd, play: show('game end') });
  }, [q]);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div ref={ref} className="glass rounded-2xl px-6 py-4 text-20 font-bold opacity-0">
        {log.at(-1)}
      </div>
      <ol className="text-14 text-[var(--tx2)]">
        {log.map((l, i) => (
          <li key={i}>
            {i + 1}. {l}
          </li>
        ))}
      </ol>
    </div>
  );
}

export const FOUNDATIONS: LabEntry[] = [
  { id: 'stamp', group: 'Foundations', title: 'Stamp', tier: 'beat', Demo: StampDemo },
  { id: 'sheen', group: 'Foundations', title: 'Sheen', tier: 'beat', Demo: SheenDemo },
  {
    id: 'confetti',
    group: 'Foundations',
    title: 'Confetti (80)',
    tier: 'beat',
    note: 'A Beat-sized burst. Reduced motion: nothing falls.',
    Demo: ConfettiDemo,
  },
  {
    id: 'sounds',
    group: 'Foundations',
    title: 'Sounds',
    tier: 'tick',
    note: 'Every synthesised sound; each plays at its tier under "All".',
    Demo: SoundsDemo,
  },
  {
    id: 'queue',
    group: 'Foundations',
    title: 'Moment queue',
    tier: 'moment',
    note: 'Pushed: small unlock, big unlock, Boston, game end, in one hand. Plays game end, then Boston (two a hand); tap skips.',
    Demo: QueueDemo,
  },
];
