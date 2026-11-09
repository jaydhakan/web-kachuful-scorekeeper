import { m } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { COLORS, EMOJIS, MOREMOJI, type Seat } from '@/people';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { t } from '@/strings';
import { PRESS, PRESS_SM } from '@/components/ui/motion';
import { Icon } from '@/components/ui/Icons';

/** A seated player's menu: rename, change avatar, clear the seat. */
export function SeatMenu({
  seat,
  onRename,
  onAvatar,
  onClear,
}: {
  seat: Seat;
  onRename: () => void;
  onAvatar: () => void;
  onClear: () => void;
}) {
  const items: [ReactNode, string, () => void, boolean?][] = [
    [Icon.edit, t.sheets.rename, onRename],
    [seat.emoji, t.sheets.changeAvatar, onAvatar],
    [Icon.trash, t.sheets.clearSeat, onClear, true],
  ];
  return (
    <>
      {items.map(([ic, label, f, neg]) => (
        <m.button
          key={label}
          type="button"
          whileTap={PRESS}
          onClick={f}
          className={`flex min-h-14 w-full items-center gap-3.5 rounded-2xl px-2 text-left text-18 font-medium ${neg ? 'text-[var(--neg)]' : ''}`}
        >
          <span aria-hidden className="grid w-7 place-items-center text-22">
            {ic}
          </span>
          {label}
        </m.button>
      ))}
    </>
  );
}

/** Renames seat `k`; a name already at the table is refused. */
export function RenameForm({
  k,
  seats,
  onSave,
}: {
  k: number;
  seats: (Seat | null)[];
  onSave: (name: string) => void;
}) {
  const [v, setV] = useState(seats[k]?.name ?? ''),
    [err, setErr] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const save = () => {
    const nm = v.trim();
    if (!nm) return;
    if (seats.some((q, i) => q && i !== k && q.name.toLowerCase() === nm.toLowerCase())) {
      setErr(t.setup.alreadySeated(nm));
      return;
    }
    onSave(nm);
  };
  return (
    <>
      <input
        ref={input}
        id="rn"
        aria-label={t.setup.playerName}
        value={v}
        maxLength={14}
        autoComplete="off"
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck={false}
        onChange={(e) => {
          setV(e.target.value);
          setErr('');
        }}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        className="mb-1 h-14 w-full rounded-2xl mat-inp px-4 text-18 outline-none"
      />
      <div className="min-h-6 text-14 text-[var(--warn)]" role="alert">
        {err}
      </div>
      <PrimaryButton className="w-full" onClick={save}>
        {t.common.save}
      </PrimaryButton>
    </>
  );
}

/** A seat's emoji and colour. */
export function AvatarPicker({
  seat,
  onPatch,
  onDone,
}: {
  seat: Seat;
  onPatch: (patch: Pick<Seat, 'emoji'> | Pick<Seat, 'color'>) => void;
  onDone: () => void;
}) {
  const emojis = EMOJIS.concat(MOREMOJI);
  const emojiNav = useRovingFocus({
    selected: emojis.indexOf(seat.emoji),
    columns: 7,
    orientation: 'grid',
  });
  const colourNav = useRovingFocus({ selected: COLORS.indexOf(seat.color) });
  return (
    <>
      <div className="mb-4 grid grid-cols-7 gap-2" {...emojiNav.group}>
        {emojis.map((e, i) => (
          <m.button
            key={e}
            type="button"
            aria-label={t.sheets.avatar(e)}
            aria-pressed={seat.emoji === e}
            {...emojiNav.item(i)}
            whileTap={PRESS_SM}
            onClick={() => onPatch({ emoji: e })}
            className={`glass grid aspect-square min-h-11 place-items-center !rounded-2xl text-26 ${seat.emoji === e ? 'ring-2 ring-[var(--accent)]' : ''}`}
          >
            {e}
          </m.button>
        ))}
      </div>
      {/* 44px circles do not fit ten across a phone: rows of four until there is room for one row. */}
      <div
        className="mb-4 grid grid-cols-4 justify-items-center gap-2 roomy:flex roomy:flex-wrap roomy:justify-start roomy:gap-2.5"
        {...colourNav.group}
      >
        {COLORS.map((c, i) => (
          <m.button
            key={c}
            type="button"
            aria-label={t.sheets.colour}
            aria-pressed={seat.color === c}
            {...colourNav.item(i)}
            whileTap={PRESS_SM}
            onClick={() => onPatch({ color: c })}
            className={`h-11 w-11 shrink-0 rounded-full border-[3px] ${seat.color === c ? 'border-text-primary' : 'border-transparent'}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <PrimaryButton className="w-full" onClick={onDone}>
        {t.common.done}
      </PrimaryButton>
    </>
  );
}
