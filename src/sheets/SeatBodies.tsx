import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { COLORS, EMOJIS, MOREMOJI } from '@/domain';
import { useApp } from '@/state/store';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { t } from '@/strings';

export function SeatBody({ k }: { k: number }) {
  const { state, actions } = useApp();
  const s = state.setup?.seats[k];
  if (!s) return null;
  const items: [string, string, () => void, boolean?][] = [
    ['✏️', t.sheets.rename, () => actions.openSheet({ type: 'rename', k })],
    [s.emoji, t.sheets.changeAvatar, () => actions.openSheet({ type: 'avatar', k })],
    [
      '🗑️',
      t.sheets.clearSeat,
      () => {
        actions.setupSeat(k, null);
        actions.openSheet(null);
      },
      true,
    ],
  ];
  return (
    <>
      {items.map(([ic, t, f, neg]) => (
        <motion.button
          key={t}
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={f}
          className={`flex min-h-14 w-full items-center gap-3.5 rounded-2xl px-2 text-left text-18 font-medium ${neg ? 'text-[var(--neg)]' : ''}`}
        >
          <span aria-hidden className="w-7 text-center text-22">
            {ic}
          </span>
          {t}
        </motion.button>
      ))}
    </>
  );
}

export function RenameBody({ k }: { k: number }) {
  const { state, actions } = useApp();
  const seats = state.setup?.seats ?? [],
    s = seats[k];
  const [v, setV] = useState(s?.name ?? ''),
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
    actions.setupSeatPatch(k, { name: nm });
    actions.openSheet(null);
  };
  return (
    <>
      <input
        ref={input}
        id="rn"
        aria-label={t.setup.playerName}
        value={v}
        maxLength={14}
        onChange={(e) => {
          setV(e.target.value);
          setErr('');
        }}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        className="mb-1 h-14 w-full rounded-2xl bg-white/[.07] px-4 text-18 outline-none focus:shadow-[0_0_0_3px_var(--glow)]"
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

export function AvatarBody({ k }: { k: number }) {
  const { state, actions } = useApp();
  const s = state.setup?.seats[k];
  if (!s) return null;
  return (
    <>
      <div className="mb-4 grid grid-cols-7 gap-2">
        {EMOJIS.concat(MOREMOJI).map((e) => (
          <motion.button
            key={e}
            type="button"
            aria-label={t.sheets.avatar(e)}
            aria-pressed={s.emoji === e}
            whileTap={{ scale: 0.88 }}
            onClick={() => actions.setupSeatPatch(k, { emoji: e })}
            className={`glass grid aspect-square min-h-11 place-items-center !rounded-2xl text-26 ${s.emoji === e ? 'ring-2 ring-[var(--accent)]' : ''}`}
          >
            {e}
          </motion.button>
        ))}
      </div>
      <div className="mb-4 flex gap-2.5">
        {COLORS.map((c) => (
          <motion.button
            key={c}
            type="button"
            aria-label={t.sheets.colour}
            aria-pressed={s.color === c}
            whileTap={{ scale: 0.85 }}
            onClick={() => actions.setupSeatPatch(k, { color: c })}
            className={`h-11 w-11 rounded-full border-[3px] ${s.color === c ? 'border-text-primary' : 'border-transparent'}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <PrimaryButton className="w-full" onClick={() => actions.openSheet(null)}>
        {t.common.done}
      </PrimaryButton>
    </>
  );
}
