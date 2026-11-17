import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { stamp } from '../stamp';
import { SeatSpotlight, type SeatPoint } from '../ui';
import { reducedMotion } from '../waapi';
import type { LabEntry } from './registry';

const SEATS = [
  { name: 'Meera', emoji: '🦉', x: 50, y: 20 },
  { name: 'Riya', emoji: '🦊', x: 15, y: 50 },
  { name: 'Kabir', emoji: '🐼', x: 85, y: 50 },
  { name: 'Aarav', emoji: '🐯', x: 50, y: 80 },
];

function LastPartner() {
  const box = useRef<HTMLDivElement>(null);
  const [pts, setPts] = useState<{ from: SeatPoint; to: SeatPoint; ac: AbortController } | null>(
    null,
  );
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const at = (i: number): SeatPoint => {
        const r = box.current!.children[i].getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
      };
      setPts({ from: at(0), to: at(2), ac: new AbortController() });
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className="felt absolute inset-4 rounded-[40%]">
      <div ref={box}>
        {SEATS.map((s) => (
          <span
            key={s.name}
            className="absolute grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ov/20 text-24"
            style={{ left: `${s.x}%`, top: `${s.y}%` }}
          >
            {s.emoji}
          </span>
        ))}
      </div>
      {pts && (
        <SeatSpotlight
          from={pts.from}
          to={pts.to}
          line="Kabir is with Meera!"
          tone="var(--kt-bid)"
          reduced={reducedMotion()}
          signal={pts.ac.signal}
          onDone={() => undefined}
        />
      )}
    </div>
  );
}

function Stamped({ word, tone }: { word: string; tone: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => stamp(ref.current, { delay: 300 }).cancel, []);
  return (
    <div className="grid h-full place-items-center">
      <span className="relative">
        <span
          ref={ref}
          className={`absolute -top-5 right-0 rounded-md border-2 border-current bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] px-1 text-13 font-extrabold uppercase tracking-[0.08em] ${tone}`}
        >
          {word}
        </span>
        <span className="disp text-40 font-extrabold text-[var(--accent-tx)]">
          {word === 'Sold' ? 180 : 1010}
        </span>
      </span>
    </div>
  );
}

export const KAALI_TEERI: LabEntry[] = [
  {
    id: 'kt-last-partner',
    group: 'Kaali Teeri',
    title: 'K1 The last partner',
    tier: 'beat',
    note: 'The table dims, the light travels from Meera to Kabir, the ring snaps on, the line inks in; never takes a tap. Reduced: ring and line.',
    Demo: LastPartner,
  },
  {
    id: 'kt-sold',
    group: 'Kaali Teeri',
    title: 'K2 SOLD',
    tier: 'beat',
    note: 'Stamps over the won bid as the auction closes, with the gavel.',
    Demo: () => <Stamped word="Sold" tone="text-[var(--gold-tx)]" />,
  },
  {
    id: 'kt-1000',
    group: 'Kaali Teeri',
    title: 'K3 Reaching 1,000',
    tier: 'beat',
    note: 'On the summary: the total turns gold and 1000 stamps on it once it has counted up.',
    Demo: () => <Stamped word="1000" tone="text-[var(--gold-tx)]" />,
  },
];
