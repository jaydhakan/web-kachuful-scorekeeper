import { m } from 'framer-motion';
import { useId, useState, type ReactNode } from 'react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { Sheet } from '@/components/ui/Sheet';
import { ToggleTrack } from '@/components/ui/Toggle';
import { PRESS_SM } from '@/components/ui/motion';
import { vibrate } from '@/hooks/useHaptics';
import { NAME_MAX, STANDARD_RULES, TARGET_MAX, TARGET_MIN, type SpRules } from '../domain';
import { rulesSheet as s } from '../strings/online';

export interface EditRulesProps {
  rules: SpRules;
  /** The table's name (online only). */
  name?: string;
  /** False shows the same sheet read-only (a guest at someone else's table). */
  editable: boolean;
  /** Called on every change, so the summary line updates live. */
  onChange: (rules: SpRules, name?: string) => void;
  onClose: () => void;
  /** Online only: who may change these, for the read-only line. */
  hostName?: string;
  /** Table mode hides the turn timer. */
  online: boolean;
}

type Target = '100' | '200' | '300' | 'endless' | 'custom';
type Timer = '30' | '60' | 'off';
const PRESETS = [100, 200, 300];
const CUSTOM_START = 400;

const targetOf = (t: number | null): Target =>
  t === null ? 'endless' : PRESETS.includes(t) ? (String(t) as Target) : 'custom';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="mb-4">
      <h3 className="mono-label mx-1 mb-2 text-13 text-[var(--tx2)]">{title}</h3>
      {children}
    </section>
  );
}

function Switch({
  label,
  sub,
  on,
  disabled,
  onToggle,
}: {
  label: string;
  sub: string;
  on: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <m.button
      type="button"
      role="switch"
      aria-checked={on}
      aria-disabled={disabled || undefined}
      onPointerDown={disabled ? undefined : () => vibrate(6)}
      onClick={disabled ? undefined : onToggle}
      whileTap={disabled ? undefined : 'press'}
      className="flex min-h-[3.75rem] w-full items-center justify-between gap-3 px-3.5 py-2 text-left aria-disabled:opacity-50 [&+&]:shadow-[inset_0_1px_0_color-mix(in_srgb,var(--tx)_10%,transparent)]"
    >
      <span className="flex min-w-0 flex-col">
        <span className="text-16 font-bold">{label}</span>
        <span className="text-14 leading-5 text-[var(--tx2)]">{sub}</span>
      </span>
      <ToggleTrack on={on} />
    </m.button>
  );
}

/**
 * The Edit rules sheet body (plan §2.2): the table's name (online), Game, Bidding and Ending, then Reset to standard.
 * Every change calls `onChange` at once. Read-only for a guest, with who can change them. `EditRulesSheet` wraps it.
 */
export default function EditRules({
  rules,
  name,
  editable,
  onChange,
  onClose,
  hostName,
  online,
}: EditRulesProps) {
  const uid = useId();
  const [custom, setCustom] = useState(() =>
    targetOf(rules.target) === 'custom' ? (rules.target as number) : CUSTOM_START,
  );
  const [draftName, setDraftName] = useState(name ?? '');
  const [nameBad, setNameBad] = useState(false);
  const [said, setSaid] = useState('');
  const locked = !editable;
  const set = (p: Partial<SpRules>) => {
    setSaid('');
    onChange({ ...rules, ...p });
  };

  const pickTarget = (v: Target) => {
    if (v === 'endless') set({ target: null });
    else if (v === 'custom') set({ target: custom });
    else set({ target: Number(v) });
  };
  const step = (d: number) => {
    const n = Math.max(TARGET_MIN, Math.min(TARGET_MAX, custom + d));
    setCustom(n);
    set({ target: n });
  };
  const commitName = () => {
    const n = draftName.trim();
    if (name === undefined || n === name) return void setNameBad(false);
    if (!n || n.length > NAME_MAX) return void setNameBad(true);
    setNameBad(false);
    onChange(rules, n);
  };
  const reset = () => {
    onChange({ ...STANDARD_RULES });
    setCustom(CUSTOM_START);
    setSaid(s.resetDone);
  };

  const opt = <T extends string>(v: T, label: string) => ({ v, label, disabled: locked });
  const target = targetOf(rules.target);
  const timer: Timer = rules.timerSec === null ? 'off' : (String(rules.timerSec) as Timer);
  const nameId = `${uid}-name`;
  const errId = `${uid}-err`;

  return (
    <div className="flex flex-col">
      {online && name !== undefined && editable && (
        <div className="mb-4 flex flex-col gap-1.5">
          <label htmlFor={nameId} className="mono-label mx-1 text-13 text-[var(--tx2)]">
            {s.nameLabel}
          </label>
          <input
            id={nameId}
            value={draftName}
            maxLength={NAME_MAX + 10}
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={nameBad || undefined}
            aria-describedby={nameBad ? errId : undefined}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitName();
              }
            }}
            className="mat-inp min-h-12 w-full rounded-[14px] px-3.5 text-16 outline-none"
          />
          {nameBad && (
            <p id={errId} role="alert" className="mx-1 text-14 font-medium text-[var(--warn)]">
              {s.nameError}
            </p>
          )}
        </div>
      )}
      <p className="mb-4 text-15 leading-[1.4] text-[var(--tx2)]">
        {editable ? (online ? s.editableOnline : s.editableTable) : s.readOnly(hostName ?? '')}
      </p>

      <Group title={s.game}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <span className="mx-1 text-15 font-semibold">{s.playTo}</span>
            <Seg<Target>
              uid={`${uid}-target`}
              label={s.playTo}
              value={target}
              onChange={pickTarget}
              size="sm"
              className="flex w-full [&>button]:min-w-0 [&>button]:flex-1 [&>button]:px-1"
              options={[
                opt<Target>('100', '100'),
                opt<Target>('200', '200'),
                opt<Target>('300', '300'),
                opt<Target>('endless', s.endless),
                opt<Target>('custom', s.custom),
              ]}
            />
            {target === 'custom' && (
              <div className="flex items-center justify-center gap-3 pt-1">
                {[-10, 10].map((d) => (
                  <m.button
                    key={d}
                    type="button"
                    aria-label={d < 0 ? s.less : s.more}
                    aria-disabled={
                      locked || (d < 0 ? custom <= TARGET_MIN : custom >= TARGET_MAX) || undefined
                    }
                    onClick={() => !locked && step(d)}
                    whileTap={locked ? undefined : PRESS_SM}
                    className="mat-fill-s grid h-12 w-12 place-items-center rounded-2xl text-24 font-bold aria-disabled:opacity-40"
                    style={{ order: d < 0 ? 0 : 2 }}
                  >
                    {d < 0 ? '−' : '+'}
                  </m.button>
                ))}
                <output
                  aria-live="polite"
                  className="disp order-1 min-w-[5.5rem] text-center text-28 font-bold tabular-nums"
                >
                  {custom}
                  <span className="sr-only"> {s.customValue(custom)}</span>
                </output>
              </div>
            )}
          </div>
          {online && (
            <div className="flex flex-col gap-2">
              <span className="mx-1 text-15 font-semibold">{s.timer}</span>
              <Seg<Timer>
                uid={`${uid}-timer`}
                label={s.timer}
                value={timer}
                onChange={(v) => set({ timerSec: v === 'off' ? null : (Number(v) as 30 | 60) })}
                size="sm"
                className="flex w-full [&>button]:flex-1"
                options={[
                  opt<Timer>('30', s.seconds(30)),
                  opt<Timer>('60', s.seconds(60)),
                  opt<Timer>('off', s.timerOff),
                ]}
              />
            </div>
          )}
        </div>
      </Group>

      <Group title={s.bidding}>
        <div className="glass overflow-hidden">
          <Switch
            label={s.nil}
            sub={s.nilSub}
            on={rules.nil}
            disabled={locked}
            onToggle={() => set(rules.nil ? { nil: false, blindNil: false } : { nil: true })}
          />
          <Switch
            label={s.blindNil}
            sub={rules.nil ? s.blindNilSub : s.blindNeedsNil}
            on={rules.nil && rules.blindNil}
            disabled={locked || !rules.nil}
            onToggle={() => set({ blindNil: !rules.blindNil })}
          />
          <Switch
            label={s.minBid}
            sub={s.minBidSub}
            on={rules.minTeamBid !== null}
            disabled={locked}
            onToggle={() => set({ minTeamBid: rules.minTeamBid === null ? 4 : null })}
          />
        </div>
      </Group>

      <Group title={s.ending}>
        <div className="glass overflow-hidden">
          <Switch
            label={s.mercy}
            sub={s.mercySub}
            on={rules.mercy !== null}
            disabled={locked}
            onToggle={() => set({ mercy: rules.mercy === null ? -200 : null })}
          />
        </div>
      </Group>

      <p role="status" className="min-h-6 text-center text-14 text-[var(--tx2)]">
        {said}
      </p>
      {editable ? (
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="press min-h-[52px] shrink-0 rounded-[16px] px-2 text-15 font-semibold text-[var(--tx2)]"
          >
            {s.reset}
          </button>
          <PrimaryButton data-autofocus="" className="min-h-[52px] flex-1" onClick={onClose}>
            {s.done}
          </PrimaryButton>
        </div>
      ) : (
        <PrimaryButton
          data-autofocus=""
          tone="glass"
          className="mt-1 min-h-[52px] w-full"
          onClick={onClose}
        >
          {s.close}
        </PrimaryButton>
      )}
    </div>
  );
}

/** The body in its sheet ("Table rules"), for a screen that has nothing else to put around it. */
export function EditRulesSheet(props: EditRulesProps) {
  return (
    <Sheet title={s.title} onClose={props.onClose}>
      <EditRules {...props} />
    </Sheet>
  );
}
