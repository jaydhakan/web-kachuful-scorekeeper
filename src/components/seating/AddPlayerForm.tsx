import { m, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { emailKey, nameKey, suggestName } from '@/people';
import { livePlayers, namesOf, type Person } from '@/state/registry';
import type { PlayerSummary } from '@/sync/types';
import { checkNewPlayer, confirmSame, personFor, SameCard, type FullName } from './SamePerson';
import { findPerson, lacksEmail } from './seatLook';
import type { Seating } from './useSeating';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { EASE, PRESS } from '@/components/ui/motion';
import { t } from '@/strings';

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
// A search field, so iOS does not offer contacts; the browser's own clear button is off-theme.
const SEARCH = '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden';

/**
 * Seats the table one seat after another: find someone you know or type a new name. The field is at the top of a
 * full-height sheet, so the keyboard only ever covers the list below it.
 */
export function AddPlayerForm({
  seating: { n, seats, tgt, filled, prompt, signedIn, known, free, seat },
  name: start = '',
  onClose,
  say,
  vib,
}: {
  seating: Seating;
  /** Opens on this known player's email. */
  name?: string;
  /** Every seat is taken: the form's sheet closes. Keep it stable (it is an effect dependency). */
  onClose: () => void;
  say: (msg: string) => void;
  vib: () => void;
}) {
  const rm = useReducedMotion();
  const [name, setName] = useState(start),
    [email, setEmail] = useState(''),
    [first, setFirst] = useState(''),
    [last, setLast] = useState(''),
    [full, setFull] = useState(false),
    [err, setErr] = useState<{ msg: string; on: 'name' | 'email' } | null>(null),
    [rename, setRename] = useState(''),
    [match, setMatch] = useState<{ player: PlayerSummary; alias: boolean } | null>(null),
    // A person with more than one name, picked from the list: which name sits at the table.
    [choose, setChoose] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const inp = useRef<HTMLInputElement>(null),
    mail = useRef<HTMLInputElement>(null),
    firstRef = useRef<HTMLInputElement>(null),
    nameId = useId(),
    promptId = useId(),
    hintId = useId(),
    listId = useId();
  const nm = clean(name);
  const who = nm ? findPerson(known, nm) : undefined;
  // Known while typing, so the email row is there before Add, not a second form after it.
  const askEmail = signedIn && lacksEmail(who);
  const ready = !!nm && (!askEmail || !!email.trim());
  const q = nameKey(nm);
  // Found by any of their names; one row per person.
  const keys = (p: Person) => namesOf(p).map(nameKey);
  const shown = q
    ? free
        .filter((p) => keys(p).some((k) => k.includes(q)))
        .sort(
          (a, b) =>
            Number(keys(b).some((k) => k.startsWith(q))) -
            Number(keys(a).some((k) => k.startsWith(q))),
        )
    : free;
  useEffect(() => {
    if (tgt < 0) onClose();
  }, [tgt, onClose]);

  const fail = (msg: string, on: 'name' | 'email') => {
    setErr({ msg, on });
    vib();
  };
  const edited = () => {
    setErr(null);
    setRename('');
    setMatch(null);
    setChoose(null);
  };
  const place = (raw: string, person?: Person, extra: { email?: string } & FullName = {}) => {
    seat(raw, person, extra);
    setName('');
    setEmail('');
    setFirst('');
    setLast('');
    setFull(false);
    edited();
    // The next seat is typed straight away, with the keyboard still up.
    if (document.activeElement instanceof HTMLInputElement) inp.current?.focus();
  };
  const add = async () => {
    if (busy || tgt < 0 || !nm) return;
    // Seated already, under this name or another of theirs.
    const ex = seats.find(
      (s) => s && (s.name.toLowerCase() === nm.toLowerCase() || (who && s.playerId === who.id)),
    );
    if (ex) return fail(t.setup.alreadySeated(ex.name), 'name');
    if (!askEmail) return place(nm, who);
    if (!email.trim()) return mail.current?.focus();
    setBusy(true);
    const r = await checkNewPlayer(
      nm,
      email,
      seats.flatMap((s) => (s?.email ? [s.email] : [])),
    );
    setBusy(false);
    if (r.kind === 'match') return setMatch(r);
    if (r.kind === 'emailErr') return fail(r.msg, 'email');
    if (r.kind === 'nameTaken') {
      setRename(suggestName(nm, new Set(livePlayers().map((p) => p.nameKey))));
      return fail(r.msg, 'name');
    }
    place(nm, who, {
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
  const pick = (r: Person) => {
    if (tgt < 0) return;
    // Signed in, someone with no email is never seated without one: fill the name and ask for it.
    if (signedIn && lacksEmail(r)) {
      setName(r.displayName);
      edited();
      setTimeout(() => mail.current?.focus(), 0);
      return;
    }
    // Typed one of their names: that one. Otherwise someone with several names picks which sits at the table.
    const names = namesOf(r);
    const typed = names.find((x) => nameKey(x) === q);
    if (names.length > 1 && !typed) return setChoose(choose === r.id ? null : r.id);
    place(typed ?? r.displayName, r);
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
      id={nameId}
      type="search"
      data-autofocus={start ? undefined : ''}
      aria-label={t.setup.playerName}
      aria-describedby={`${promptId}${hint ? ` ${hintId}` : ''}`}
      aria-controls={listId}
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
      placeholder={t.setup.findOrAdd}
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
      className={`${SEARCH} ${
        signedIn
          ? ROW_INPUT
          : 'h-14 min-w-0 flex-1 bg-transparent px-4 text-18 tracking-[-0.01em] outline-none focus-visible:outline-none placeholder:text-[var(--ph)]'
      }`}
    />
  );
  return (
    <div className="flex flex-col">
      <p
        id={promptId}
        role="status"
        className="text-17 font-semibold leading-[1.3] text-[var(--tx2)] [text-wrap:balance]"
      >
        {prompt}
      </p>
      {tgt >= 0 && (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
          className="mt-3 flex flex-col"
        >
          <div className="flex gap-2">
            {/* One card for one person: name, then email when it is needed, then the optional full name. */}
            <div
              className={`min-w-0 flex-1 overflow-hidden rounded-2xl mat-inp ${signedIn ? '' : 'focus-within:shadow-[inset_0_0_0_2px_var(--focus)]'} ${err?.on === 'name' && !signedIn ? 'shadow-[inset_0_0_0_1px_var(--neg)]' : ''}`}
            >
              {signedIn ? (
                <label
                  htmlFor={nameId}
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
                    className={`${ROW} ${SEP} ${err?.on === 'email' ? 'shadow-[inset_0_0_0_1px_var(--neg)]' : ''}`}
                  >
                    <span className={ROW_LABEL}>{t.setup.emailLabel}</span>
                    <input
                      ref={mail}
                      type="email"
                      inputMode="email"
                      data-autofocus={start ? '' : undefined}
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
                className="mat-sq mat-sm !h-14 w-24 !text-16"
              >
                {t.setup.add}
              </PrimaryButton>
            )}
          </div>
          <div
            role="alert"
            className={`text-14 font-medium leading-[1.3] text-[var(--warn)] [text-wrap:balance] ${err ? 'pt-2' : ''}`}
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
              className="press mt-1 min-h-11 self-start rounded-xl px-1 text-14 font-bold text-[var(--accent-tx)]"
            >
              {x.addFullName}
            </button>
          )}
          {signedIn &&
            (match ? (
              <SameCard
                className="mt-3"
                match={match.player}
                alias={match.alias ? nm : undefined}
                onYes={() => {
                  void confirmSame(
                    match.player,
                    nm,
                    {
                      ...(first.trim() && { firstName: first.trim() }),
                      ...(last.trim() && { lastName: last.trim() }),
                    },
                    say,
                  );
                  place(nm, personFor(match.player));
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
      {tgt >= 0 &&
        (shown.length > 0 ? (
          <div id={listId} role="group" aria-labelledby={`${listId}-h`} className="mt-5">
            <h3 id={`${listId}-h`} className="mono-label mb-1 px-2 text-13 text-[var(--tx2)]">
              {t.setup.peopleYouKnow}
            </h3>
            {shown.map((r) => {
              const names = namesOf(r);
              return (
                <div key={r.id}>
                  <m.button
                    type="button"
                    whileTap={PRESS}
                    onMouseDown={keepFocus}
                    onClick={() => pick(r)}
                    aria-expanded={names.length > 1 ? choose === r.id : undefined}
                    className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 text-left"
                  >
                    <Avatar
                      p={r}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-22"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-17 font-semibold leading-tight [overflow-wrap:anywhere]">
                        {r.displayName}
                        {names.length > 1 && (
                          <span className="font-medium text-[var(--tx2)]">
                            {' · '}
                            {t.setup.alsoAs(names.slice(1))}
                          </span>
                        )}
                      </span>
                      {signedIn && lacksEmail(r) && (
                        <span className="block text-13 text-[var(--tx2)]">
                          {t.setup.needsEmail}
                        </span>
                      )}
                    </span>
                  </m.button>
                  {choose === r.id && (
                    <m.div
                      role="group"
                      aria-label={t.setup.seatAs(r.displayName)}
                      initial={reveal}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className="flex flex-wrap gap-2 pb-2 pl-[3.75rem] pr-2"
                    >
                      {names.map((x) => (
                        <button
                          key={x}
                          type="button"
                          onMouseDown={keepFocus}
                          onClick={() => place(x, r)}
                          className="press glass min-h-11 rounded-xl px-3 text-15 font-bold"
                        >
                          {x}
                        </button>
                      ))}
                    </m.div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p id={listId} className="mt-5 text-14 leading-[1.35] text-[var(--tx2)]">
            {nm && free.length ? t.setup.noMatch(nm) : t.setup.recentHint}
          </p>
        ))}
    </div>
  );
}
