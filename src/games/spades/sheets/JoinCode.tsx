import { useId, useState, type ClipboardEvent, type FormEvent } from 'react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Sheet } from '@/components/ui/Sheet';
import { vibrate } from '@/hooks/useHaptics';
import { CODE_ALPHABET, CODE_LENGTH, cleanCode, codeFromPaste } from '@/games/spades/code';
import { home as h } from '@/games/spades/strings/home';

const CELLS = Array.from({ length: CODE_LENGTH }, (_, i) => i);

/** The first typed character that can never be in a code (I, O, 0, 1, punctuation), for the hint. */
const refused = (raw: string) =>
  [...raw.toUpperCase()].find((ch) => ch.trim() && !CODE_ALPHABET.includes(ch)) ?? null;

/**
 * Four boxes for the table code, drawn over one real field: typing fills the next box (upper-cased, lookalikes
 * refused), Backspace empties the last, and a pasted code or share link fills them all.
 */
export function CodeField({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (code: string) => void;
  onSubmit: () => void;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [bad, setBad] = useState<string | null>(null);
  const set = (raw: string, fromPaste = false) => {
    const next = fromPaste ? codeFromPaste(raw) : cleanCode(raw);
    setBad(fromPaste ? null : refused(raw));
    onChange(next);
  };
  const paste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    set(e.clipboardData.getData('text'), true);
  };
  const active = Math.min(value.length, CODE_LENGTH - 1);
  return (
    <div className="flex flex-col items-center gap-2">
      <label htmlFor={id} className="mono-label text-13 text-[var(--tx2)]">
        {h.join.label}
      </label>
      <div className="relative grid w-full max-w-[20rem] grid-cols-4 gap-2.5">
        {CELLS.map((i) => (
          <span
            key={i}
            aria-hidden
            data-cell={i}
            className={`mat-inp disp relative grid h-[68px] place-items-center rounded-2xl text-36 font-bold tabular-nums ${
              focused && i === active
                ? 'outline outline-2 outline-offset-2 outline-[var(--focus)]'
                : ''
            }`}
          >
            {value[i] ?? ''}
            {focused && i === value.length && (
              <span className="sp-caret absolute bottom-3 h-[3px] w-6 rounded-full bg-[var(--accent)]" />
            )}
          </span>
        ))}
        <input
          id={id}
          value={value}
          onChange={(e) => set(e.target.value)}
          onPaste={paste}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit();
            }
          }}
          aria-describedby={`${id}-hint`}
          aria-invalid={bad ? true : undefined}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          data-autofocus
          className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
        />
      </div>
      <p
        id={`${id}-hint`}
        aria-live="polite"
        className={`min-h-[1.25rem] text-center text-14 ${bad ? 'font-semibold text-[var(--warning)]' : 'text-[var(--tx2)]'}`}
      >
        {bad ? h.join.notInCodes(bad) : h.join.hint}
      </p>
    </div>
  );
}

/** Join with code: four characters, then the table. */
export default function JoinCodeSheet({
  onJoin,
  onClose,
}: {
  onJoin: (code: string) => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState('');
  const ready = code.length === CODE_LENGTH;
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (ready) onJoin(code);
  };
  return (
    <Sheet title={h.join.title} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5 pb-2">
        <p className="text-16 text-[var(--tx2)]">{h.join.body}</p>
        <CodeField value={code} onChange={setCode} onSubmit={submit} />
        <PrimaryButton
          type="submit"
          disabled={!ready}
          onPointerDown={() => ready && vibrate(8)}
          className="w-full"
        >
          {h.join.go}
        </PrimaryButton>
      </form>
    </Sheet>
  );
}
