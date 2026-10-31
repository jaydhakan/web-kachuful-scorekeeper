import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { COLORS, EMOJIS } from '@/domain';
import { t } from '@/strings';

const INPUT =
  'h-14 w-full rounded-2xl bg-white/[.07] px-4 text-18 outline-none placeholder:text-[var(--ph)] focus:shadow-[0_0_0_3px_var(--glow),inset_0_0_0_1px_var(--accent)] aria-[invalid=true]:shadow-[inset_0_0_0_1px_var(--neg)]';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  error?: ReactNode;
  /** Content inside the field on the right (show/hide). */
  end?: ReactNode;
}

/** A labelled text field with its hint or error below, announced with the field. */
export function Field({ label, value, onChange, hint, error, end, ...rest }: FieldProps) {
  const id = useId();
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-14 font-bold text-[var(--tx2)]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={hint || error ? id + '-d' : undefined}
          className={`${INPUT} ${end ? 'pr-14' : ''}`}
          {...rest}
        />
        {end && <div className="absolute inset-y-0 right-1 flex items-center">{end}</div>}
      </div>
      {(error || hint) && (
        <div
          id={id + '-d'}
          role={error ? 'alert' : undefined}
          className={`mt-1.5 text-14 ${error ? 'text-[var(--warn)]' : 'text-[var(--tx2)]'}`}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
}

/** A password field with a show/hide toggle. */
export function PasswordField(props: Omit<FieldProps, 'type' | 'end'>) {
  const [show, setShow] = useState(false);
  return (
    <Field
      {...props}
      type={show ? 'text' : 'password'}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      end={
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? t.hub.auth.hide : t.hub.auth.show}
          aria-pressed={show}
          className="grid h-12 w-12 place-items-center rounded-xl text-20"
        >
          <span aria-hidden>{show ? '🙈' : '👁️'}</span>
        </button>
      }
    />
  );
}

/** Emoji and colour for a player. */
export function LookPicker({
  emoji,
  color,
  onChange,
}: {
  emoji: string;
  color: string;
  onChange: (v: { emoji: string; color: string }) => void;
}) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-1.5 text-14 font-bold text-[var(--tx2)]">{t.hub.auth.look}</legend>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={e === emoji}
            aria-label={e}
            onClick={() => onChange({ emoji: e, color })}
            className={`grid h-11 w-11 place-items-center rounded-xl text-22 ${e === emoji ? 'bg-white/20 shadow-[inset_0_0_0_2px_var(--accent)]' : 'bg-white/[.05]'}`}
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={c === color}
            aria-label={c}
            onClick={() => onChange({ emoji, color: c })}
            className={`h-11 w-11 rounded-full ${c === color ? 'shadow-[0_0_0_3px_var(--tx)]' : ''}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </fieldset>
  );
}
