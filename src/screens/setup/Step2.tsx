import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { COLORS, EMOJIS } from '@/domain';
import { KEYS, storage } from '@/state/persistence';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Table } from '@/components/ui/Table';
import { EASE } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { SetupFrame } from './SetupFrame';
import { useSetup } from './useSetup';
import { t } from '@/strings';

export function Step2() {
  const { su, actions } = useSetup();
  const [name, setName] = useState(''),
    [err, setErr] = useState(''),
    [drop, setDrop] = useState<number | null>(null);
  const inp = useRef<HTMLInputElement>(null);
  const n = su.n ?? 0,
    seats = su.seats;
  const tgt = seats.findIndex((s) => !s),
    filled = seats.filter(Boolean).length;
  const prompt = (() => {
    if (tgt < 0) return t.setup.everyoneSeated;
    if (tgt === 0) return t.setup.dealingFirst;
    const pv = seats[(tgt - 1 + n) % n],
      pn = pv ? pv.name : t.setup.thePlayerBefore;
    return seats.filter((x) => !x).length === 1 && tgt === n - 1
      ? t.setup.finally(pn, su.dir)
      : t.setup.sittingOn(pn, su.dir);
  })();
  const recent = storage
    .get<string[]>(KEYS.recentNames, [])
    .filter((x) => !seats.some((s) => s && s.name.toLowerCase() === x.toLowerCase()))
    .slice(0, 10);
  useEffect(() => {
    const t = setTimeout(() => inp.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [tgt]);
  const add = (raw: string) => {
    const nm = (raw || '').trim().replace(/\s+/g, ' ');
    if (!nm || tgt < 0) return;
    const ex = seats.find((s) => s && s.name.toLowerCase() === nm.toLowerCase());
    if (ex) {
      setErr(t.setup.alreadySeated(ex.name));
      actions.vib();
      return;
    }
    actions.setupSeat(tgt, {
      name: nm.charAt(0).toUpperCase() + nm.slice(1),
      emoji: EMOJIS[tgt],
      color: COLORS[tgt],
    });
    setDrop(tgt);
    setName('');
    setErr('');
    actions.vib();
  };
  return (
    <SetupFrame
      step={2}
      title={t.setup.step2Title}
      bar={
        <PrimaryButton
          className="w-full"
          disabled={tgt >= 0}
          onClick={() => actions.setupPatch({ step: 3, dealer: 0 })}
        >
          {t.common.next}
        </PrimaryButton>
      }
    >
      <div className="h-[300px]">
        <Table
          uid="su2"
          n={n}
          dir={su.dir}
          players={seats}
          dealer={seats[0] ? 0 : undefined}
          first={seats[1] ? 1 : undefined}
          hl={tgt >= 0 ? tgt : undefined}
          dropIdx={drop}
          noSeatAnim={filled > 0}
          arrowFrom={tgt > 0 && seats[tgt - 1] ? tgt - 1 : undefined}
          arrowTo={tgt > 0 && seats[tgt - 1] ? tgt : undefined}
          onSeat={(k) => seats[k] && actions.openSheet({ type: 'seat', k })}
          center={<div className="text-13 text-[var(--tx2)]">{t.setup.seated(filled, n)}</div>}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={prompt}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="mt-4 min-h-8 text-21 font-bold tracking-[-0.02em]"
        >
          {prompt}
        </motion.div>
      </AnimatePresence>
      {tgt >= 0 && (
        <div className="mt-2.5 flex gap-2">
          <input
            ref={inp}
            id="nm"
            aria-label={t.setup.playerName}
            value={name}
            maxLength={14}
            autoComplete="off"
            placeholder={t.setup.typeName}
            onChange={(e) => {
              setName(e.target.value);
              setErr('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(name);
              }
            }}
            className={`h-14 min-w-0 flex-1 rounded-2xl bg-white/[.07] px-4 text-18 tracking-[-0.01em] outline-none transition-shadow duration-300 placeholder:text-[var(--dis)] focus:shadow-[0_0_0_3px_var(--glow),inset_0_0_0_1px_var(--accent)] ${err ? 'shadow-[inset_0_0_0_1px_var(--neg)]' : ''}`}
          />
          <PrimaryButton onClick={() => add(name)} className="!h-14 w-24 !text-16">
            {t.setup.add}
          </PrimaryButton>
        </div>
      )}
      <div className="min-h-[22px] pt-2 text-14 font-medium text-[var(--warn)]" role="alert">
        {err}
      </div>
      <div className="flex flex-wrap gap-2">
        {tgt >= 0 &&
          recent.map((r, i) => (
            <motion.button
              key={r}
              type="button"
              {...stagger(i)}
              whileTap={{ scale: 0.94 }}
              onClick={() => add(r)}
              className="glass min-h-12 !rounded-full px-4 text-16 font-medium"
            >
              {r}
            </motion.button>
          ))}
      </div>
    </SetupFrame>
  );
}
