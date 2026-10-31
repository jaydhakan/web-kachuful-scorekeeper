import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { nameKey, suggestName } from '@/domain';
import { useApp } from '@/state/store';
import { knownSame, rememberSame, SameCard, serverMatch } from './SamePerson';
import { people, type Person } from '@/state/registry';
import { useArchive } from '@/state/useArchive';
import { findPerson, lookFor } from './seatLook';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Table } from '@/components/ui/Table';
import { EASE } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { SetupFrame, TableSlot } from './SetupFrame';
import { useSetup } from './useSetup';
import { t } from '@/strings';

export function Step2() {
  const { su, actions } = useSetup();
  const { state } = useApp();
  const [name, setName] = useState(''),
    [err, setErr] = useState(''),
    [drop, setDrop] = useState<number | null>(null);
  const inp = useRef<HTMLInputElement>(null),
    promptId = useId();
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
  const known = useArchive(() => people());
  const recent = known
    .filter((x) => !seats.some((s) => s && nameKey(s.name) === x.nameKey))
    .slice(0, 10);
  useEffect(() => {
    const t = setTimeout(() => inp.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [tgt]);
  const [same, setSame] = useState<Person | null>(null);
  const signedIn = !!state.session;
  const add = (raw: string, who?: Person) => {
    const nm = (raw || '').trim().replace(/\s+/g, ' ');
    if (!nm || tgt < 0) return;
    // Signed in, a typed name the server already has asks whether it's the same person first.
    if (signedIn && !who) {
      const m = serverMatch(nm);
      if (m) {
        setSame(m);
        return;
      }
      who = knownSame(nm);
    }
    setSame(null);
    const ex = seats.find((s) => s && s.name.toLowerCase() === nm.toLowerCase());
    if (ex) {
      setErr(t.setup.alreadySeated(ex.name));
      actions.vib();
      return;
    }
    const look = lookFor(who ?? findPerson(known, nm), seats, tgt);
    actions.setupSeat(tgt, { name: nm.charAt(0).toUpperCase() + nm.slice(1), ...look });
    setDrop(tgt);
    setName('');
    setErr('');
    actions.vib();
  };
  return (
    <SetupFrame
      step={2}
      title={t.setup.step2Title}
      fit
      collapseBar
      bar={
        <PrimaryButton
          className="w-full"
          disabled={tgt >= 0}
          onClick={() => actions.setupPatch({ step: 3, dealer: 0 })}
        >
          {t.common.next}
        </PrimaryButton>
      }
      aside={
        // In land the keyboard covers the lower pane, so the input is ordered first there (land:order-*).
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={prompt}
              id={promptId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="mt-4 min-h-8 text-21 font-bold leading-[1.25] tracking-[-0.02em] [text-wrap:balance] @h-[45rem]:mt-0 @h-short:text-19 land:order-2 land:!mt-2 wide:!mt-0 wide:mb-1"
            >
              {prompt}
            </motion.div>
          </AnimatePresence>
          {tgt >= 0 && (
            <div className="mt-2.5 flex gap-2 @h-[45rem]:mt-1.5 land:order-1 land:!mt-0">
              <input
                ref={inp}
                id="nm"
                aria-label={t.setup.playerName}
                aria-describedby={promptId}
                value={name}
                maxLength={14}
                autoComplete="off"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                // An explicit hint makes Android send Enter (which adds the name) instead of moving focus on and
                // closing the keyboard; the field stays focused for the next seat.
                enterKeyHint={filled === n - 1 ? 'done' : 'next'}
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
                className={`h-14 min-w-0 flex-1 rounded-2xl bg-white/[.07] px-4 text-18 tracking-[-0.01em] outline-none placeholder:text-[var(--ph)] focus:shadow-[0_0_0_3px_var(--glow),inset_0_0_0_1px_var(--accent)] @h-[45rem]:h-11 ${err ? 'shadow-[inset_0_0_0_1px_var(--neg)]' : ''}`}
              />
              <PrimaryButton
                onClick={() => add(name)}
                className="!h-14 w-24 !text-16 @h-[45rem]:!h-11 land:w-20"
              >
                {t.setup.add}
              </PrimaryButton>
            </div>
          )}
          {same && tgt >= 0 && (
            <SameCard
              className="mt-2 land:order-3"
              match={same}
              suggestion={suggestName(same.displayName, new Set(known.map((p) => p.nameKey)))}
              onYes={() => {
                rememberSame(same.displayName, same.id);
                add(same.displayName, same);
              }}
              onNo={() => {
                const alt = suggestName(same.displayName, new Set(known.map((p) => p.nameKey)));
                setSame(null);
                add(alt, undefined);
              }}
            />
          )}
          <div
            className="min-h-[22px] pt-2 text-14 font-medium leading-[1.3] text-[var(--warn)] [text-wrap:balance] @h-[45rem]:min-h-[18px] @h-[45rem]:pt-0 land:order-3"
            role="alert"
          >
            {err}
          </div>
          {tgt >= 0 && !recent.length && (
            <p className="text-13 text-[var(--tx2)] land:order-4">{t.setup.recentHint}</p>
          )}
          {tgt >= 0 && recent.length > 0 && (
            // One row that scrolls sideways, so a long list never pushes the input off screen.
            <div
              role="group"
              aria-label={t.setup.recentNames}
              className="scroll-thin -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 @h-[45rem]:pb-0 [mask-image:linear-gradient(to_right,transparent,black_1.25rem,black_calc(100%-2rem),transparent)] land:order-4 wide:flex-wrap wide:overflow-visible wide:[mask-image:none]"
            >
              {recent.map((r, i) => (
                <motion.button
                  key={r.id}
                  type="button"
                  {...stagger(i)}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => add(r.displayName, r)}
                  className="glass inline-flex min-h-12 shrink-0 items-center gap-1.5 whitespace-nowrap !rounded-full pl-2 pr-4 text-16 font-medium @h-[45rem]:min-h-11"
                >
                  <span aria-hidden className="text-18">
                    {r.emoji}
                  </span>
                  {r.displayName}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      }
    >
      {/* With the keyboard up there is no room for the table above the field, so it steps aside. */}
      <TableSlot players={n} className="@h-tiny:hidden pane:!flex">
        <Table
          uid="su2"
          fit
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
      </TableSlot>
    </SetupFrame>
  );
}
