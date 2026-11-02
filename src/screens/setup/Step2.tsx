import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { emailKey, nameKey, suggestName } from '@/domain';
import { useApp } from '@/state/store';
import { checkNewPlayer, personFor, SameCard, type FullName } from './SamePerson';
import { circle, livePlayers, people, rememberSame, type Person } from '@/state/registry';
import type { PlayerSummary } from '@/sync/types';
import { useArchive } from '@/state/useArchive';
import { findPerson, lacksEmail, lookFor } from './seatLook';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Table } from '@/components/ui/Table';
import { Icon } from '@/components/ui/Icons';
import { EASE, PRESS } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { SetupFrame, TableSlot } from './SetupFrame';
import { useSetup } from './useSetup';
import { t } from '@/strings';
import { Avatar } from '@/components/ui/Avatar';

const x = t.hub.sync2;
const clean = (s: string) => s.trim().replace(/\s+/g, ' ');
// Pressing a button would take focus from the field and close the keyboard; seating the whole table keeps it up.
const keepFocus = (e: MouseEvent) => e.preventDefault();
// The row shows focus, so the field's own outline is off; the ring is rounded to sit inside the card.
const ROW =
  'relative flex min-h-12 items-center gap-3 rounded-2xl px-4 focus-within:shadow-[inset_0_0_0_2px_var(--focus)]';
// An inset hairline between rows, as in a grouped list; a border would curve with the rounded focus ring.
const SEP =
  'before:pointer-events-none before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-ov/[.1]';
const ROW_LABEL = 'w-12 shrink-0 text-15 font-semibold text-[var(--tx2)]';
const ROW_INPUT =
  'h-12 min-w-0 flex-1 bg-transparent text-17 outline-none focus-visible:outline-none placeholder:text-[var(--ph)]';

export function Step2() {
  const { su, actions } = useSetup();
  const { state } = useApp();
  const rm = useReducedMotion();
  const [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [first, setFirst] = useState(''),
    [last, setLast] = useState(''),
    [full, setFull] = useState(false),
    [err, setErr] = useState<{ msg: string; on: 'name' | 'email' } | null>(null),
    [rename, setRename] = useState(''),
    [match, setMatch] = useState<PlayerSummary | null>(null),
    [busy, setBusy] = useState(false),
    [drop, setDrop] = useState<number | null>(null);
  const inp = useRef<HTMLInputElement>(null),
    mail = useRef<HTMLInputElement>(null),
    firstRef = useRef<HTMLInputElement>(null),
    promptId = useId(),
    hintId = useId();
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
  const session = state.session;
  const signedIn = !!session;
  // Signed in, only this account's circle is suggested (and matched by name); anyone else needs an email.
  const known = useArchive(() =>
    session ? circle(session.user.id, session.player?.id ?? null) : people(),
  );
  const recent = known
    .filter((x) => !seats.some((s) => s && nameKey(s.name) === x.nameKey))
    .slice(0, 10);
  const nm = clean(name);
  const who = nm ? findPerson(known, nm) : undefined;
  // Known while typing, so the email row is there before Add, not a second form after it.
  const askEmail = signedIn && lacksEmail(who);
  const ready = !!nm && (!askEmail || !!email.trim());
  useEffect(() => {
    const t = setTimeout(() => inp.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [tgt]);

  const fail = (msg: string, on: 'name' | 'email') => {
    setErr({ msg, on });
    actions.vib();
  };
  const seat = (raw: string, person?: Person, extra: { email?: string } & FullName = {}) => {
    const look = lookFor(person ?? findPerson(known, raw), seats, tgt);
    actions.setupSeat(tgt, { name: raw.charAt(0).toUpperCase() + raw.slice(1), ...look, ...extra });
    setDrop(tgt);
    setName('');
    setEmail('');
    setFirst('');
    setLast('');
    setFull(false);
    setErr(null);
    setRename('');
    setMatch(null);
    actions.vib();
    // The next seat is typed straight away, with the keyboard still up.
    if (document.activeElement instanceof HTMLInputElement) inp.current?.focus();
  };
  const add = async () => {
    if (busy || tgt < 0 || !nm) return;
    const ex = seats.find((s) => s && s.name.toLowerCase() === nm.toLowerCase());
    if (ex) return fail(t.setup.alreadySeated(ex.name), 'name');
    if (!askEmail) return seat(nm, who);
    if (!email.trim()) return mail.current?.focus();
    setBusy(true);
    const r = await checkNewPlayer(
      nm,
      email,
      seats.flatMap((s) => (s?.email ? [s.email] : [])),
    );
    setBusy(false);
    if (r.kind === 'match') return setMatch(r.player);
    if (r.kind === 'emailErr') return fail(r.msg, 'email');
    if (r.kind === 'nameTaken') {
      setRename(suggestName(nm, new Set(livePlayers().map((p) => p.nameKey))));
      return fail(r.msg, 'name');
    }
    seat(nm, who, {
      email: emailKey(email),
      ...(first.trim() && { firstName: first.trim() }),
      ...(last.trim() && { lastName: last.trim() }),
    });
  };
  const onEnter = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    void add();
  };
  const edited = () => {
    setErr(null);
    setRename('');
    setMatch(null);
  };
  const pick = (r: Person) => {
    // A player on this device with no email still needs one: fill the name and ask for it.
    if (signedIn && lacksEmail(r)) {
      setName(r.displayName);
      edited();
      mail.current?.focus();
    } else seat(r.displayName, r);
  };
  const reveal = rm ? { opacity: 0 } : { opacity: 0, y: -6 };

  const hint = err
    ? null
    : !signedIn || !nm
      ? null
      : askEmail
        ? x.emailHint
        : t.setup.knownHint(nm);
  const nameField = (
    <input
      ref={inp}
      id="nm"
      aria-label={t.setup.playerName}
      aria-describedby={`${promptId}${hint ? ` ${hintId}` : ''}`}
      aria-invalid={err?.on === 'name' || undefined}
      value={name}
      maxLength={14}
      autoComplete="off"
      autoCapitalize="words"
      autoCorrect="off"
      spellCheck={false}
      // An explicit hint makes Android send Enter (which adds the name, or moves on to the email) instead of moving
      // focus on and closing the keyboard.
      enterKeyHint={askEmail || filled < n - 1 ? 'next' : 'done'}
      placeholder={t.setup.typeName}
      onChange={(e) => {
        setName(e.target.value);
        edited();
      }}
      onKeyDown={(e) => {
        // With an email to give, Return goes on to it (the key says "next"); it never sends an email typed earlier.
        if (e.key === 'Enter' && askEmail && nm) {
          e.preventDefault();
          mail.current?.focus();
        } else onEnter(e);
      }}
      className={
        signedIn
          ? ROW_INPUT
          : 'h-14 min-w-0 flex-1 bg-transparent px-4 text-18 tracking-[-0.01em] outline-none focus-visible:outline-none placeholder:text-[var(--ph)] @h-[45rem]:h-11'
      }
    />
  );
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
        // In land the keyboard covers the lower pane, so the form is ordered first there (land:order-*).
        <div className="flex flex-col">
          <AnimatePresence mode="wait">
            <m.div
              key={prompt}
              id={promptId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="mt-4 min-h-8 text-21 font-bold leading-[1.25] tracking-[-0.02em] [text-wrap:balance] @h-[45rem]:mt-0 @h-short:text-19 kb:mt-1 land:order-2 land:!mt-2 wide:!mt-0 wide:mb-1"
            >
              {prompt}
            </m.div>
          </AnimatePresence>
          {tgt >= 0 && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void add();
              }}
              className="mt-2.5 flex flex-col @h-[45rem]:mt-1.5 land:order-1 land:!mt-0"
            >
              <div className="flex gap-2">
                {/* One card for one person: name, then email when it is needed, then the optional full name. */}
                <div
                  className={`min-w-0 flex-1 overflow-hidden rounded-2xl mat-inp ${signedIn ? '' : 'focus-within:shadow-[inset_0_0_0_2px_var(--focus)]'} ${err?.on === 'name' && !signedIn ? 'shadow-[inset_0_0_0_1px_var(--neg)]' : ''}`}
                >
                  {signedIn ? (
                    <label
                      htmlFor="nm"
                      className={`${ROW} ${err?.on === 'name' ? 'shadow-[inset_0_0_0_1px_var(--neg)]' : ''}`}
                    >
                      <span className={ROW_LABEL}>{t.setup.nameLabel}</span>
                      {nameField}
                    </label>
                  ) : (
                    <div className="flex">{nameField}</div>
                  )}
                  {signedIn &&
                    (askEmail ? (
                      <label
                        htmlFor="em"
                        className={`${ROW} ${SEP} ${err?.on === 'email' ? 'shadow-[inset_0_0_0_1px_var(--neg)]' : ''}`}
                      >
                        <span className={ROW_LABEL}>{t.setup.emailLabel}</span>
                        <input
                          ref={mail}
                          id="em"
                          type="email"
                          inputMode="email"
                          autoComplete="off"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          enterKeyHint="done"
                          aria-label={nm ? x.emailFor(nm) : t.setup.emailLabel}
                          aria-describedby={hint ? hintId : undefined}
                          aria-invalid={err?.on === 'email' || undefined}
                          value={email}
                          placeholder={x.emailPlaceholder}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            edited();
                          }}
                          onKeyDown={onEnter}
                          className={ROW_INPUT}
                        />
                      </label>
                    ) : (
                      // Same height as the email row, so typing a known name never moves the form.
                      <div className={`${ROW} ${SEP}`}>
                        <span className={ROW_LABEL}>{t.setup.emailLabel}</span>
                        <span className="flex items-center gap-1.5 text-15 font-semibold text-[var(--pos)] [&_svg]:h-[18px] [&_svg]:w-[18px]">
                          {Icon.check}
                          {t.setup.knownPlayer}
                        </span>
                      </div>
                    ))}
                  {signedIn && askEmail && full && (
                    <m.div
                      initial={reveal}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: EASE }}
                    >
                      {(
                        [
                          [t.setup.firstLabel, t.hub.auth.firstName, first, setFirst, firstRef],
                          [t.setup.lastLabel, t.hub.auth.lastName, last, setLast, undefined],
                        ] as const
                      ).map(([label, aria, v, set, ref]) => (
                        <label key={label} className={`${ROW} ${SEP}`}>
                          <span className={ROW_LABEL}>{label}</span>
                          <input
                            ref={ref}
                            aria-label={aria}
                            value={v}
                            onChange={(e) => set(e.target.value)}
                            onKeyDown={onEnter}
                            autoComplete="off"
                            autoCapitalize="words"
                            autoCorrect="off"
                            spellCheck={false}
                            enterKeyHint="done"
                            className={ROW_INPUT}
                          />
                        </label>
                      ))}
                    </m.div>
                  )}
                </div>
                {!signedIn && (
                  <PrimaryButton
                    type="submit"
                    onMouseDown={keepFocus}
                    className="mat-sq mat-sm !h-14 w-24 !text-16 @h-[45rem]:!h-11 land:w-20"
                  >
                    {t.setup.add}
                  </PrimaryButton>
                )}
              </div>
              <div
                role="alert"
                className={`text-14 font-medium leading-[1.3] text-[var(--warn)] [text-wrap:balance] ${err ? 'pt-2' : signedIn ? '' : 'min-h-[22px] @h-[45rem]:min-h-[18px]'}`}
              >
                {err?.msg}
              </div>
              {hint && (
                <p id={hintId} className="pt-2 text-13 leading-[1.35] text-[var(--tx2)]">
                  {hint}
                </p>
              )}
              {rename && (
                <button
                  type="button"
                  onMouseDown={keepFocus}
                  onClick={() => {
                    setName(rename);
                    edited();
                  }}
                  className="press glass mt-2 min-h-11 self-start rounded-xl px-3 text-14 font-bold"
                >
                  {x.useSuggestion(rename)}
                </button>
              )}
              {signedIn && askEmail && nm && !full && (
                <button
                  type="button"
                  onMouseDown={keepFocus}
                  onClick={() => {
                    setFull(true);
                    // Focus moves on in the same tap, so the keyboard stays up.
                    setTimeout(() => firstRef.current?.focus(), 0);
                  }}
                  className="press mt-1 min-h-11 self-start rounded-xl px-1 text-14 font-bold text-[var(--accent)]"
                >
                  {x.addFullName}
                </button>
              )}
              {signedIn &&
                (match ? (
                  <SameCard
                    className="mt-3"
                    match={match}
                    onYes={() => {
                      rememberSame(match.id);
                      seat(match.displayName, personFor(match));
                    }}
                    onNo={() => {
                      setMatch(null);
                      fail(x.recheckHint, 'email');
                      mail.current?.focus();
                    }}
                  />
                ) : (
                  <PrimaryButton
                    type="submit"
                    onMouseDown={keepFocus}
                    disabled={!ready || busy}
                    aria-busy={busy || undefined}
                    className="mt-3 w-full !h-12 !rounded-2xl !text-16"
                  >
                    {busy ? t.setup.checking : nm ? t.setup.addNamed(nm) : t.setup.add}
                  </PrimaryButton>
                ))}
            </form>
          )}
          {tgt >= 0 && !recent.length && (
            <p className="mt-2 text-13 text-[var(--tx2)] land:order-4">{t.setup.recentHint}</p>
          )}
          {tgt >= 0 && recent.length > 0 && (
            // One row that scrolls sideways, so a long list never pushes the input off screen.
            <div
              role="group"
              aria-label={t.setup.recentNames}
              className={`scroll-thin edge-fade -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 @h-[45rem]:pb-0 land:order-4 wide:flex-wrap wide:overflow-visible ${signedIn ? 'mt-3' : ''}`}
            >
              {recent.map((r, i) => (
                <m.button
                  key={r.id}
                  type="button"
                  {...stagger(i)}
                  whileTap={PRESS}
                  onMouseDown={keepFocus}
                  onClick={() => pick(r)}
                  className="glass inline-flex min-h-12 shrink-0 items-center gap-1.5 whitespace-nowrap !rounded-full pl-2 pr-4 text-16 font-medium @h-[45rem]:min-h-11"
                >
                  <Avatar
                    p={r}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-18"
                  />
                  {r.displayName}
                </m.button>
              ))}
            </div>
          )}
        </div>
      }
    >
      {/* With the keyboard up the form gets the screen and the table steps aside (Scaffold collapseBar). */}
      <TableSlot players={n}>
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
          center={<div className="text-13 text-[var(--ctr-fg)]">{t.setup.seated(filled, n)}</div>}
        />
      </TableSlot>
    </SetupFrame>
  );
}
