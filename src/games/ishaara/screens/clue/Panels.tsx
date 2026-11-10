import { useEffect, useId, useRef, useState } from 'react';
import { clueGiverOf, type IshaaraPublic, type Team } from '@/games/ishaara/domain';
import { clue } from '@/games/ishaara/strings/clue';
import { Mark } from './KeyParts';
import { CTA, OUTLINE, PANEL, mmss, useCountdown } from './clueKit';

function Timer({ game, offset }: { game: IshaaraPublic; offset: number }) {
  const left = useCountdown(game.status === 'active' ? game.deadline : null, offset);
  if (left === null) return null;
  return (
    <p
      role="timer"
      aria-label={clue.timerLabel}
      className="inline-flex min-h-10 items-center gap-2 justify-self-start rounded-full px-4 text-16 font-semibold tabular-nums shadow-[inset_0_0_0_1.5px_var(--key-edge)]"
    >
      <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4">
        <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M8 4.5V8l2.4 1.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      {clue.timer(mmss(left))}
    </p>
  );
}

function Head({ team, children }: { team: Team; children: string }) {
  return (
    <h2 className="flex items-center gap-3 text-24 font-bold tracking-[-0.01em]">
      <span className={team === 'sun' ? 'text-key-sun-ink' : 'text-key-moon-ink'}>
        <Mark id={team} className="h-4 w-4" />
      </span>
      {children}
    </h2>
  );
}

/** Your team is guessing on your clue. */
export function OursPanel({ game, offset }: { game: IshaaraPublic; offset: number }) {
  const c = game.clue;
  if (!c) return null;
  return (
    <section className={`${PANEL} grid gap-2`}>
      <Head team={game.turn}>{clue.ours.title(game.turn)}</Head>
      <p className="text-18 font-semibold">
        {c.word === null ? clue.ours.spoken(c.number) : clue.ours.typed(c.word, c.number)}
      </p>
      <p className="text-16 text-key-text-2">
        {clue.ours.guessesLeft(game.guessesLeft)} · {clue.ours.hint}
      </p>
      <Timer game={game} offset={offset} />
    </section>
  );
}

/** The other team's turn: their clue, and Not allowed (with a confirm) until their first guess. */
export function TheirsPanel({
  game,
  offset,
  disabled,
  onNotAllowed,
}: {
  game: IshaaraPublic;
  offset: number;
  disabled: boolean;
  onNotAllowed(): void;
}) {
  const t = game.turn;
  const c = game.clue;
  const [asking, setAsking] = useState(false);
  const uid = useId();
  const yes = useRef<HTMLButtonElement>(null);
  const ask = useRef<HTMLButtonElement>(null);
  const open = !!c && game.guessedThisTurn === 0 && !game.pending;
  const was = useRef(asking);
  useEffect(() => {
    if (asking) yes.current?.focus();
    else if (was.current) ask.current?.focus();
    was.current = asking;
  }, [asking]);
  useEffect(() => {
    if (!open) setAsking(false);
  }, [open]);
  const name = clueGiverOf(game, t)?.name ?? clue.team[t];

  return (
    <section className={`${PANEL} grid gap-3`}>
      <Head team={t}>{c ? clue.theirs.title(t) : clue.theirs.thinking(t)}</Head>
      {c && (
        <p className="text-18 font-semibold">
          {c.word === null
            ? clue.theirs.spoken(name, c.number)
            : clue.theirs.typed(name, c.word, c.number)}
        </p>
      )}
      <p className="text-16 text-key-text-2">{clue.theirs.hint(t)}</p>
      <Timer game={game} offset={offset} />
      {c &&
        (asking ? (
          <div role="group" aria-labelledby={`${uid}-t`} className="grid gap-2 pt-1">
            <p id={`${uid}-t`} className="text-18 font-bold">
              {clue.theirs.confirmTitle}
            </p>
            <p className="text-16 text-key-text-2">{clue.theirs.confirmBody(t)}</p>
            <button
              ref={yes}
              type="button"
              disabled={disabled || !open}
              onClick={() => {
                setAsking(false);
                onNotAllowed();
              }}
              className={CTA}
            >
              {clue.theirs.confirm}
            </button>
            <button type="button" onClick={() => setAsking(false)} className={OUTLINE}>
              {clue.theirs.cancel}
            </button>
          </div>
        ) : (
          <div className="grid gap-2 pt-1">
            <button
              ref={ask}
              type="button"
              disabled={disabled || !open}
              aria-describedby={`${uid}-h`}
              onClick={() => setAsking(true)}
              className={`${OUTLINE} text-key-alert`}
            >
              {clue.theirs.notAllowed}
            </button>
            <p id={`${uid}-h`} className="text-14 text-key-text-2">
              {open ? clue.theirs.notAllowedHint : clue.theirs.tooLate}
            </p>
          </div>
        ))}
    </section>
  );
}

/** A ruling went against the other team: this phone picks one of its own words to reveal. */
export function PenaltyPanel({
  game,
  selected,
  disabled,
  onConfirm,
  onClear,
}: {
  game: IshaaraPublic;
  selected: number | null;
  disabled: boolean;
  onConfirm(): void;
  onClear(): void;
}) {
  return (
    <section className={`${PANEL} grid gap-3`} aria-live="polite">
      <h2 className="text-22 font-bold">{clue.penalty.pick}</h2>
      {selected === null ? (
        <p className="text-16 text-key-text-2">{clue.penalty.pickHint}</p>
      ) : (
        <>
          <p className="text-16">{clue.penalty.chosen(game.words[selected])}</p>
          <button type="button" disabled={disabled} onClick={onConfirm} className={CTA}>
            {clue.penalty.confirm(game.words[selected])}
          </button>
          <button type="button" onClick={onClear} className={OUTLINE}>
            {clue.penalty.another}
          </button>
        </>
      )}
    </section>
  );
}

export function NotePanel({ title, body }: { title?: string; body: string }) {
  return (
    <section className={`${PANEL} grid gap-2`}>
      {title && <h2 className="text-22 font-bold">{title}</h2>}
      <p className="text-16 text-key-text-2">{body}</p>
    </section>
  );
}

export function FinishedPanel({
  game,
  team,
  onNext,
  onBack,
}: {
  game: IshaaraPublic;
  team: Team;
  onNext(id: string): void;
  onBack(): void;
}) {
  const w = game.winner;
  return (
    <section className={`${PANEL} grid gap-3`}>
      {w && <Head team={w}>{clue.finished.won(w)}</Head>}
      <p className="text-16 text-key-text-2">
        {game.endedBy && clue.finished.by[game.endedBy]}
        {w && ` ${clue.finished.you(w === team)}`}
      </p>
      {game.next ? (
        <button type="button" onClick={() => onNext(game.next!)} className={CTA}>
          {clue.finished.next}
        </button>
      ) : (
        <button type="button" onClick={onBack} className={CTA}>
          {clue.finished.back}
        </button>
      )}
    </section>
  );
}
