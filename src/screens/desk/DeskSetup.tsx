import { animate, AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import {
  COLORS,
  cycleLen,
  DECK_OPTIONS,
  EMOJIS,
  maxFor,
  nameKey,
  playerCounts,
  type Decks,
  type LengthMode,
} from '@/domain';
import { circle, people, type Person } from '@/state/registry';
import { useArchive } from '@/state/useArchive';
import { findPerson, lookFor } from '@/screens/setup/seatLook';
import { EmailStep, personFor } from '@/screens/setup/SamePerson';
import { useApp } from '@/state/store';
import type { Seat } from '@/state/types';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { SuitCenter } from '@/components/ui/SuitCenter';
import { Table } from '@/components/ui/Table';
import { EASE, SPRING, SPRING_POP } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { DeskPage, Eyebrow, GhostButton, Kbd, PageHead } from './DeskParts';
import { useDeskKeys } from './useDeskKeys';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';

/** SPRING, typed for the imperative animate(). */
const SWAP = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } as const;

/** A seat list `n` long that keeps whoever is already seated. */
const resize = (seats: (Seat | null)[], n: number) =>
  Array.from({ length: n }, (_, i) => seats[i] ?? null);

/** Trimmed, single-spaced and capitalised, like a name added on the phone. */
const tidy = (raw: string) => {
  const nm = raw.trim().replace(/\s+/g, ' ');
  return nm.charAt(0).toUpperCase() + nm.slice(1);
};

const Section = ({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: ReactNode;
}) => (
  <section className="glass flex flex-col gap-3 p-5">
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="disp text-22 font-extrabold tracking-[-0.02em]">{title}</h2>
      {aside && <span className="text-13 text-[var(--tx2)]">{aside}</span>}
    </div>
    {children}
  </section>
);

/** New game on one page: count, seats, dealer and length on the left; the table as it will be dealt on the right. */
export function DeskSetup() {
  const { state, actions } = useApp();
  const su = state.setup;
  const rm = useReducedMotion();
  const [spin, setSpin] = useState<number | null>(null);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const grips = useRef<(HTMLButtonElement | null)[]>([]);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [drag, setDrag] = useState<{ k: number; y0: number; dy: number; to: number } | null>(null);
  const refocus = useRef<number | null>(null);
  const counts = playerCounts(su?.decks ?? 1);
  const roving = useRovingFocus({ selected: counts.indexOf(su?.n ?? 0) });
  useEffect(() => {
    if (refocus.current == null) return;
    grips.current[refocus.current]?.focus();
    refocus.current = null;
  });
  const n = su?.n ?? 0,
    seats = su ? resize(su.seats, n) : [],
    filled = seats.filter((s) => s && s.name.trim()).length;
  const names = seats.map((s) => (s ? nameKey(s.name) : ''));
  const session = state.session;
  const signedIn = !!session;
  // Signed in, only this account's circle is suggested (and matched by name); anyone else needs an email.
  const known = useArchive(() =>
    session ? circle(session.user.id, session.player?.id ?? null) : people(),
  );
  const dupe = names.find((x, i) => x && names.indexOf(x) !== i);
  const noEmail = signedIn
    ? seats.findIndex(
        (x) => x && x.name.trim() && !x.playerId && !x.email && !findPerson(known, x.name),
      )
    : -1;
  const [emailDraft, setEmailDraft] = useState('');
  const ready = !!n && filled === n && !dupe && noEmail < 0;
  const deal = () => ready && actions.beginGame();
  useDeskKeys({ enter: deal });
  if (!su) return null;
  const lg = su.lg,
    lgDecks = lg?.decks ?? 1,
    lgFits = !!lg && playerCounts(lgDecks).includes(lg.names.length);
  const recent = known.filter((x) => !names.includes(x.nameKey)).slice(0, 6);
  const dealer = Math.min(su.dealer, Math.max(0, n - 1)),
    shown = spin ?? dealer,
    first = n ? (shown + 1) % n : 0;

  const pickCount = (k: number) => {
    actions.setupPatch({ n: k, seats: resize(su.seats, k), dealer: Math.min(su.dealer, k - 1) });
    actions.vib();
  };
  const type = (k: number, v: string) => {
    const s = seats[k];
    if (!v) {
      if (s) actions.setupSeat(k, null);
      return;
    }
    if (s) actions.setupSeatPatch(k, { name: v });
    else actions.setupSeat(k, { name: v, emoji: EMOJIS[k], color: COLORS[k] });
  };
  const commit = (k: number) => {
    const s = seats[k];
    if (s && tidy(s.name) !== s.name) actions.setupSeatPatch(k, { name: tidy(s.name) });
  };
  const nextField = (k: number) => {
    commit(k);
    const next = seats.findIndex((s, i) => i !== k && !s?.name.trim());
    if (next >= 0) inputs.current[next]?.focus();
    else document.querySelector<HTMLElement>('[data-deal]')?.focus();
  };
  const fill = (who: Person) => {
    const k = seats.findIndex((s) => !s?.name.trim());
    if (k < 0) return;
    actions.setupSeat(k, { name: who.displayName, ...lookFor(who, seats, k) });
    actions.vib();
  };
  // The two rows trade places on screen: each starts where the other was and settles.
  const swap = (a: number, b: number) => {
    if (b < 0 || b >= n || a === b) return;
    const ra = rows.current[a]?.getBoundingClientRect(),
      rb = rows.current[b]?.getBoundingClientRect();
    actions.setupSwap(a, b);
    actions.vib();
    if (!rm && ra && rb) {
      const d = rb.top - ra.top;
      requestAnimationFrame(() => {
        const ea = rows.current[a],
          eb = rows.current[b];
        if (ea) animate(ea, { y: [d, 0] }, SWAP);
        if (eb) animate(eb, { y: [-d, 0] }, SWAP);
      });
    }
  };
  const target = (y: number) => {
    let best = -1,
      dist = Infinity;
    rows.current.slice(0, n).forEach((el, i) => {
      const r = el?.getBoundingClientRect();
      if (!r) return;
      const d = Math.abs(r.top + r.height / 2 - y);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return best;
  };
  const down = (k: number) => (e: PointerEvent<HTMLButtonElement>) => {
    if (!seats[k]) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ k, y0: e.clientY, dy: 0, to: k });
  };
  const move = (e: PointerEvent<HTMLButtonElement>) =>
    drag && setDrag({ ...drag, dy: e.clientY - drag.y0, to: target(e.clientY) });
  const up = () => {
    if (!drag) return;
    const { k, to } = drag;
    setDrag(null);
    if (to !== k && to >= 0) swap(k, to);
  };
  const randomDealer = () => {
    if (!n || spin != null) return;
    const tgt = Math.floor(Math.random() * n);
    actions.vib();
    if (rm) {
      actions.setupPatch({ dealer: tgt });
      return;
    }
    // A roulette over the seats that slows down and lands on the new dealer.
    const hops = 2 * n + ((tgt - dealer + n) % n);
    let i = 0;
    const tick = () => {
      i++;
      setSpin((dealer + i) % n);
      if (i < hops) setTimeout(tick, 40 + Math.pow(i / hops, 3) * 260);
      else
        setTimeout(() => {
          actions.setupPatch({ dealer: tgt });
          setSpin(null);
          actions.vib();
        }, 200);
    };
    tick();
  };
  const L = n ? cycleLen(maxFor(n, su.decks)) : 0;
  return (
    <DeskPage scroll label={t.desk.setup.title} className="rail:overflow-hidden">
      <PageHead
        eyebrow={t.desk.setup.eyebrow}
        title={t.desk.setup.title}
        actions={
          <GhostButton onClick={() => actions.go('home', -1)}>
            {Icon.back}
            {t.common.back}
          </GhostButton>
        }
      />
      <div className="grid gap-5 rail:min-h-0 rail:flex-1 tl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] dt:grid-cols-[minmax(0,45rem)_minmax(0,1fr)] dt:gap-12">
        <div className="scroll-thin flex flex-col gap-3.5 rail:-mr-2 rail:min-h-0 rail:overflow-y-auto rail:pr-2">
          <Section title={t.desk.setup.count}>
            {lg && lgFits && (
              <motion.button
                type="button"
                {...stagger(0)}
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  actions.setupPatch({
                    decks: lgDecks,
                    n: lg.names.length,
                    dir: lg.direction || 'cw',
                    seats: lg.names.map((nm, i) => ({
                      name: nm,
                      emoji: lg.emojis[i] || EMOJIS[i],
                      color: lg.colors[i] || COLORS[i],
                    })),
                    dealer: 0,
                  })
                }
                className="inline-flex min-h-12 items-center self-start rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-4 text-left text-15 font-bold"
              >
                {t.setup.useLastGroup(lg.names)}
              </motion.button>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Seg<`${Decks}`>
                uid="ddeck"
                label={t.setup.decksLabel}
                value={`${su.decks}`}
                className="[&_button]:h-12"
                onChange={(v) => {
                  const decks = +v as Decks;
                  const keep = su.n && playerCounts(decks).includes(su.n);
                  actions.setupPatch({ decks, n: keep ? su.n : null });
                }}
                options={DECK_OPTIONS.map((d) => ({ v: `${d}` as const, label: t.setup.deck(d) }))}
              />
              <Seg
                uid="ddir"
                label={t.setup.directionLabel}
                value={su.dir}
                className="[&_button]:h-12"
                onChange={(v) => actions.setupPatch({ dir: v })}
                options={[
                  { v: 'cw', label: t.setup.cw },
                  { v: 'ccw', label: t.setup.ccw },
                ]}
              />
            </div>
            <div
              role="group"
              aria-label={t.setup.playerCount}
              {...roving.group}
              className="flex flex-wrap gap-2"
            >
              {counts.map((k, i) => (
                <motion.button
                  key={k}
                  type="button"
                  aria-pressed={su.n === k}
                  aria-label={t.setup.players(k)}
                  {...roving.item(i)}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => pickCount(k)}
                  className={`disp relative grid h-14 w-14 place-items-center rounded-2xl text-26 font-extrabold ${su.n === k ? 'text-ink-on-accent' : 'glass'}`}
                >
                  {su.n === k && (
                    <motion.span
                      layoutId="dset-n"
                      transition={SPRING_POP}
                      aria-hidden
                      className="absolute inset-0 rounded-2xl bg-accent-gradient shadow-[0_0_0_3px_var(--glow),0_10px_26px_-6px_var(--accent)]"
                    />
                  )}
                  <span className="relative">{k}</span>
                </motion.button>
              ))}
            </div>
            <p className="text-13 text-[var(--tx2)]">
              {t.setup.info(su.n, n ? maxFor(n, su.decks) : 0)}
            </p>
          </Section>
          <Section title={t.desk.setup.seats} aside={n ? t.desk.setup.seatHint : undefined}>
            {!n ? (
              <p className="text-16 text-[var(--tx2)]">{t.desk.setup.pickCount}</p>
            ) : (
              <>
                <ol className="flex flex-col gap-1.5">
                  {seats.map((s, k) => (
                    <motion.li
                      key={k}
                      ref={(el) => {
                        rows.current[k] = el;
                      }}
                      style={drag?.k === k ? { y: drag.dy, zIndex: 3 } : undefined}
                      className={`relative flex min-h-12 items-center gap-3 rounded-2xl ${drag?.k === k ? 'bg-white/10 shadow-[0_18px_40px_rgba(0,0,0,.5)]' : drag && drag.to === k ? 'bg-white/5' : ''}`}
                    >
                      <button
                        type="button"
                        ref={(el) => {
                          grips.current[k] = el;
                        }}
                        aria-label={t.desk.setup.move(s?.name || t.table.seat(k + 1))}
                        disabled={!s}
                        onPointerDown={down(k)}
                        onPointerMove={move}
                        onPointerUp={up}
                        onPointerCancel={up}
                        onKeyDown={(e) => {
                          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                          e.preventDefault();
                          const to = k + (e.key === 'ArrowUp' ? -1 : 1);
                          if (to < 0 || to >= n) return;
                          refocus.current = to;
                          swap(k, to);
                        }}
                        className="-mr-2 grid h-12 w-12 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-[var(--dis)] disabled:cursor-default disabled:opacity-40 active:cursor-grabbing"
                      >
                        {Icon.grip}
                      </button>
                      <span className="w-5 shrink-0 text-center text-13 text-[var(--tx2)]">
                        {k + 1}
                      </span>
                      <motion.button
                        type="button"
                        aria-label={t.desk.setup.avatar(s?.name || t.table.seat(k + 1))}
                        disabled={!s}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => actions.openSheet({ type: 'avatar', k })}
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 text-24 disabled:cursor-default ${s ? 'border-white/20' : 'border-dashed border-white/30 bg-white/[.04]'}`}
                        style={s ? { background: s.color } : undefined}
                      >
                        <span aria-hidden>{s?.emoji ?? ''}</span>
                      </motion.button>
                      <input
                        ref={(el) => {
                          inputs.current[k] = el;
                        }}
                        aria-label={t.desk.setup.seatName(k + 1)}
                        aria-invalid={!!dupe && names[k] === dupe}
                        value={s?.name ?? ''}
                        maxLength={14}
                        autoComplete="off"
                        autoCapitalize="words"
                        autoCorrect="off"
                        spellCheck={false}
                        // Enter moves to the next empty seat itself, keeping a tablet's keyboard up.
                        enterKeyHint="next"
                        placeholder={t.setup.typeName}
                        onChange={(e) => type(k, e.target.value)}
                        onBlur={() => commit(k)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            nextField(k);
                          }
                        }}
                        className={`h-12 min-w-0 flex-1 rounded-xl bg-white/[.07] px-3.5 text-17 outline-none placeholder:text-[var(--ph)] focus:shadow-[0_0_0_3px_var(--glow),inset_0_0_0_1px_var(--accent)] ${dupe && names[k] === dupe ? 'shadow-[inset_0_0_0_1px_var(--neg)]' : ''}`}
                      />
                      <span className="w-[4.5rem] shrink-0 text-center">
                        {k === shown ? (
                          <motion.span
                            layoutId="dset-dealer"
                            transition={SPRING}
                            className="inline-flex h-6 items-center rounded-xl bg-[var(--gold)] px-2.5 text-13 font-extrabold text-ink-gold"
                          >
                            {t.desk.setup.dealerTag}
                          </motion.span>
                        ) : k === first ? (
                          <span className="inline-flex h-6 items-center rounded-xl border border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-2 text-13 font-bold">
                            {t.desk.setup.firstTag}
                          </span>
                        ) : null}
                      </span>
                    </motion.li>
                  ))}
                </ol>
                {recent.length > 0 && filled < n && (
                  <div
                    role="group"
                    aria-label={t.setup.recentNames}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span className="text-13 text-[var(--tx2)]">{t.desk.setup.recent}</span>
                    {recent.map((r) => (
                      <motion.button
                        key={r.id}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => fill(r)}
                        className="inline-flex min-h-12 items-center gap-1.5 rounded-full border border-white/10 bg-white/[.06] pl-2 pr-3.5 text-14 font-bold"
                      >
                        <Avatar
                          p={r}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-16"
                        />
                        {r.displayName}
                      </motion.button>
                    ))}
                  </div>
                )}
              </>
            )}
          </Section>
          <Section title={t.desk.setup.dealer}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2.5">
                {seats.map((s, k) => (
                  <motion.button
                    key={k}
                    type="button"
                    disabled={!s || spin != null}
                    aria-pressed={k === dealer}
                    aria-label={t.desk.setup.makeDealer(s?.name || t.table.seat(k + 1))}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => actions.setupPatch({ dealer: k })}
                    animate={{ scale: k === shown ? 1.08 : 1 }}
                    transition={SPRING_POP}
                    className={`grid h-12 w-12 place-items-center rounded-full border-2 text-26 disabled:cursor-default ${s ? 'border-white/20' : 'border-dashed border-white/30 bg-white/[.04]'} ${k === shown ? 'shadow-[0_0_0_3px_var(--gold),0_0_22px_rgba(226,182,83,.55)]' : s ? 'opacity-75' : ''}`}
                    style={s ? { background: s.color } : undefined}
                  >
                    <span aria-hidden>{s?.emoji ?? k + 1}</span>
                  </motion.button>
                ))}
              </div>
              <GhostButton disabled={!n || spin != null} onClick={randomDealer}>
                {t.desk.setup.randomDealer}
              </GhostButton>
            </div>
            {n > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-13 text-[var(--tx2)]">{t.setup.gameLength}</span>
                <Seg<LengthMode>
                  uid="dlen"
                  label={t.setup.gameLength}
                  value={su.length}
                  className="[&_button]:min-h-12 [&_button]:px-4"
                  onChange={(v) => actions.setupPatch({ length: v })}
                  options={t.setup.lengthOptions(L)}
                />
              </div>
            )}
          </Section>
        </div>
        <aside className="glass glass-glow flex min-h-[26rem] flex-col gap-4 p-6 rail:min-h-0 dt:p-7">
          <Eyebrow>{t.desk.setup.preview}</Eyebrow>
          <div className="flex min-h-[15rem] flex-1 flex-col">
            <AnimatePresence mode="wait">
              {n ? (
                <motion.div
                  key={n}
                  className="flex min-h-0 flex-1 flex-col"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <Table
                    uid="dsu"
                    size="wide"
                    fit
                    minFit={0.5}
                    n={n}
                    dir={su.dir}
                    players={seats}
                    dealer={seats[shown] ? shown : undefined}
                    first={seats[first] ? first : undefined}
                    hl={filled < n ? seats.findIndex((s) => !s?.name.trim()) : undefined}
                    noSeatAnim={false}
                    onSeat={(k) => seats[k] && spin == null && actions.setupPatch({ dealer: k })}
                    center={<SuitCenter trump="spades" cards={3} />}
                  />
                </motion.div>
              ) : (
                <motion.p
                  key="none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid flex-1 place-items-center text-center text-16 text-[var(--tx2)]"
                >
                  {t.setup.tapNumber}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          {n > 0 && (
            <div className="flex flex-col gap-1.5 text-17 leading-normal dt:text-18">
              {seats[dealer] && <div>{t.desk.setup.dealsFirst(seats[dealer].name)}</div>}
              <div>{t.desk.setup.cardsEach}</div>
              {seats[dealer] && seats[(dealer + 1) % n] && (
                <div>
                  {t.desk.setup.firstCardTo(
                    seats[(dealer + 1) % n]!.name,
                    seats[dealer].name,
                    su.dir,
                  )}
                </div>
              )}
              <div>{t.desk.setup.spades}</div>
            </div>
          )}
          <div className="mt-auto flex flex-col gap-2">
            {noEmail >= 0 && filled === n && (
              <EmailStep
                key={noEmail + seats[noEmail]!.name}
                name={tidy(seats[noEmail]!.name)}
                initialEmail={emailDraft}
                taken={seats.flatMap((x) => (x?.email ? [x.email] : []))}
                onDone={(email) => (setEmailDraft(''), actions.setupSeatPatch(noEmail, { email }))}
                onSame={(p) => {
                  setEmailDraft('');
                  actions.setupSeatPatch(noEmail, {
                    name: p.displayName,
                    ...lookFor(personFor(p), seats, noEmail),
                  });
                }}
                onRename={(name, email) => {
                  setEmailDraft(email);
                  actions.setupSeatPatch(noEmail, { name });
                }}
              />
            )}
            {signedIn && <p className="text-13 text-[var(--tx2)]">☁️ {t.hub.sync2.countOnline}</p>}
            {n > 0 && !ready && noEmail < 0 && (
              <p role="status" className="text-14 font-medium text-[var(--warn)]">
                {dupe ? t.desk.setup.dupe(tidy(dupe)) : t.desk.setup.missing(n - filled)}
              </p>
            )}
            <PrimaryButton data-deal className="w-full" disabled={!ready} onClick={deal}>
              {t.setup.deal} {ready && <Kbd>⏎</Kbd>}
            </PrimaryButton>
          </div>
        </aside>
      </div>
    </DeskPage>
  );
}
