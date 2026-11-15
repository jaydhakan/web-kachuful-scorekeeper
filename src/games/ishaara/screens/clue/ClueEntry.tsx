import { useId, useState, type FormEvent } from 'react';
import { clueAllowed, type ClueNumber, type IshaaraPublic } from '@/games/ishaara/domain';
import { clue } from '@/games/ishaara/strings/clue';
import { CTA, PANEL } from './clueKit';

const NUMBERS: ClueNumber[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'inf'];

interface Props {
  game: Pick<IshaaraPublic, 'words' | 'revealed' | 'rules'>;
  disabled: boolean;
  onSend(word: string | null, number: ClueNumber): void;
  /** The word field has focus: on a short screen the key view drops its header so the key stays in sight. */
  onTyping?(typing: boolean): void;
}

/**
 * Your turn, as one compact bar under the key: the word (checked live against the face-down words) with Send beside
 * it, and how many words in a scrolling row of full-size keys. Short enough that the key, the bar and Send all fit
 * on a 360 × 640 phone (ISH-F09).
 */
export function ClueEntry({ game, disabled, onSend, onTyping }: Props) {
  const spoken = game.rules.clueEntry === 'spoken';
  const [word, setWord] = useState('');
  const [n, setN] = useState<ClueNumber | null>(null);
  const ids = useId();
  const check = clueAllowed(word, game);
  const ready = n !== null && (spoken || check.ok) && !disabled;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ready) onSend(spoken ? null : word.trim(), n);
  };
  const label = spoken
    ? n === null
      ? clue.entry.spokenBare
      : clue.entry.spokenSend(n)
    : n !== null && check.ok
      ? clue.entry.send(word.trim(), n)
      : clue.entry.sendBare;
  // Until a word is typed the line says what comes next; then it says whether the word may be sent.
  const msg = !word.trim()
    ? n === null
      ? clue.entry.thenHowMany
      : ''
    : check.ok
      ? clue.entry.ok
      : clue.check(check, word);
  const send = (
    <button
      type="submit"
      disabled={!ready}
      aria-label={spoken ? undefined : label}
      className={spoken ? CTA : `${CTA.replace('w-full ', '')} shrink-0`}
    >
      {spoken ? label : clue.entry.sendShort}
    </button>
  );

  return (
    <form
      onSubmit={submit}
      // Focus anywhere in the bar counts as typing, so tapping a number never reflows the screen mid-tap.
      onFocus={() => onTyping?.(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onTyping?.(false);
      }}
      className={`${PANEL} grid gap-2 p-3`}
    >
      {spoken ? (
        <p className="text-15 text-key-text-2">{clue.entry.spokenHint}</p>
      ) : (
        <>
          <div className="flex gap-2">
            <label htmlFor={`${ids}-w`} className="sr-only">
              {clue.entry.label}
            </label>
            <input
              id={`${ids}-w`}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder={clue.entry.placeholder}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="send"
              maxLength={40}
              aria-describedby={`${ids}-m`}
              aria-invalid={!!word.trim() && !check.ok}
              className="min-h-14 w-full min-w-0 flex-1 rounded-[14px] bg-key-bg px-4 text-22 font-bold uppercase text-key-text shadow-[inset_0_0_0_1.5px_var(--key-edge)] placeholder:text-18 placeholder:font-normal placeholder:normal-case placeholder:text-key-text-2"
            />
            {send}
          </div>
          <p
            id={`${ids}-m`}
            aria-live="polite"
            className={`min-h-[1.25rem] px-1 text-15 font-semibold leading-tight ${
              !word.trim() ? 'text-key-text-2' : check.ok ? 'text-key-ok' : 'text-key-alert'
            }`}
          >
            {msg}
          </p>
        </>
      )}
      <fieldset className="min-w-0">
        <legend className="sr-only">{clue.entry.howMany}</legend>
        {/* One row that scrolls sideways at 360: every key stays 48px wide (the floor is 44). */}
        <div className="-mx-3 flex snap-x gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] wide:flex-wrap wide:overflow-visible">
          {NUMBERS.map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={n === v}
              aria-label={v === 'inf' ? clue.entry.infLabel : undefined}
              onClick={() => setN(v)}
              className={`press min-h-12 min-w-12 shrink-0 snap-start rounded-[14px] px-3 text-22 font-semibold ${
                n === v
                  ? 'bg-key-cta text-key-cta-ink'
                  : 'text-key-text shadow-[inset_0_0_0_1.5px_var(--key-edge)]'
              }`}
            >
              {clue.num(v)}
            </button>
          ))}
        </div>
      </fieldset>
      {spoken && send}
    </form>
  );
}
