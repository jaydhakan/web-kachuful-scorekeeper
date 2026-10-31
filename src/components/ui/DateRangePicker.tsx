import { motion } from 'framer-motion';
import { useState } from 'react';
import { dayKey, monthLabel } from '@/lib/dates';
import { Sheet } from './Sheet';
import { PrimaryButton } from './PrimaryButton';
import { Icon } from './Icons';
import { IconButton } from './IconButton';
import { t } from '@/strings';

const W = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** A month calendar: tap the first day, then the last (or the same day twice). */
export function DateRangePicker({
  onPick,
  onClose,
}: {
  onPick: (from: string, to: string) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const lead = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const todayKey = dayKey(today.getTime());
  const tap = (k: string) => {
    if (!a || b) {
      setA(k);
      setB(null);
    } else setB(k);
  };
  const [lo, hi] = a && b ? (a <= b ? [a, b] : [b, a]) : [a, a];
  const step = (d: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + d, 1));
  return (
    <Sheet title={t.hub.stats.pickDays} onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <IconButton label={t.hub.stats.prevMonth} onClick={() => step(-1)}>
          {Icon.back}
        </IconButton>
        <div aria-live="polite" className="disp text-20 font-bold">
          {monthLabel(month.getTime())}
        </div>
        <IconButton label={t.hub.stats.nextMonth} onClick={() => step(1)}>
          <span className="rotate-180">{Icon.back}</span>
        </IconButton>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid">
        {W.map((w, i) => (
          <div key={i} aria-hidden className="pb-1 text-13 font-bold text-[var(--tx2)]">
            {w}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={'l' + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const k = dayKey(new Date(month.getFullYear(), month.getMonth(), i + 1).getTime());
          const inside = lo && hi && k >= lo && k <= hi;
          const end = k === lo || k === hi;
          return (
            <motion.button
              key={k}
              type="button"
              whileTap={{ scale: 0.9 }}
              disabled={k > todayKey}
              aria-pressed={!!inside}
              aria-label={k}
              onClick={() => tap(k)}
              className={`grid h-11 place-items-center rounded-xl text-16 font-bold disabled:opacity-30 ${end ? 'bg-[var(--accent)] text-ink-on-accent' : inside ? 'bg-white/[.12]' : ''} ${k === todayKey && !end ? 'shadow-[inset_0_0_0_1px_var(--accent)]' : ''}`}
            >
              {i + 1}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-3 min-h-6 text-14 text-[var(--tx2)]">
        {!a ? t.hub.stats.tapFirst : !b ? t.hub.stats.tapLast : ''}
      </p>
      <PrimaryButton className="mt-2 w-full" disabled={!a} onClick={() => a && onPick(a, b ?? a)}>
        {t.hub.stats.apply}
      </PrimaryButton>
    </Sheet>
  );
}
