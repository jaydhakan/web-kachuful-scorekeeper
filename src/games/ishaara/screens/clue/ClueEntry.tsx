import { useId, useState, type FormEvent } from 'react';
import { clueAllowed, type ClueNumber, type IshaaraPublic } from '@/games/ishaara/domain';
import { clue } from '@/games/ishaara/strings/clue';
import { CTA, LABEL, PANEL } from './clueKit';

const NUMBERS: ClueNumber[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'inf'];

interface Props {
  game: Pick<IshaaraPublic, 'words' | 'revealed' | 'rules'>;
  disabled: boolean;
  onSend(word: string | null, number: ClueNumber): void;
}

/** Your turn: one word checked live against the face-down words, and how many words it points to. */
export function ClueEntry({ game, disabled, onSend }: Props) {
  const spoken = game.rules.clueEntry === 'spoken';
  const [word, setWord] = useState('');
  const [n, setN] = useState<ClueNumber | null>(null);
  const ids = useId();
  const check = clueAllowed(word, game);
  const msg = check.ok ? clue.entry.ok : clue.check(check, word);
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

  return (
    <form onSubmit={submit} className={`${PANEL} grid gap-4`}>
      {spoken ? (
        <p className="text-16 text-key-text-2">{clue.entry.spokenHint}</p>
      ) : (
        <div className="grid gap-2">
          <label htmlFor={`${ids}-w`} className={LABEL}>
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
            className="min-h-14 w-full rounded-[14px] bg-key-bg px-4 text-24 font-bold uppercase text-key-text shadow-[inset_0_0_0_1.5px_var(--key-edge)] placeholder:text-18 placeholder:font-normal placeholder:normal-case placeholder:text-key-text-2"
          />
          <p
            id={`${ids}-m`}
            aria-live="polite"
            className={`min-h-[1.25rem] text-15 font-semibold ${check.ok ? 'text-key-ok' : 'text-key-alert'}`}
          >
            {word.trim() ? msg : ''}
          </p>
        </div>
      )}
      <fieldset className="grid gap-2">
        <legend className={`${LABEL} mb-2`}>{clue.entry.howMany}</legend>
        <div className="grid grid-cols-6 gap-2">
          {NUMBERS.map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={n === v}
              aria-label={v === 'inf' ? clue.entry.infLabel : undefined}
              onClick={() => setN(v)}
              className={`press min-h-12 rounded-[14px] text-22 font-semibold ${
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
      <button type="submit" disabled={!ready} className={CTA}>
        {label}
      </button>
    </form>
  );
}
