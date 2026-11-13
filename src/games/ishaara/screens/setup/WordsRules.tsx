import { m } from 'framer-motion';
import { useId } from 'react';
import { PACK_IDS, cleanCustom } from '@/games/ishaara/state/words';
import { table as s } from '@/games/ishaara/strings/table';
import { Icon } from '@/components/ui/Icons';
import { Seg } from '@/components/ui/Seg';
import { stagger } from '@/components/ui/stagger';
import { splitCustom, type Draft } from './useDraft';

const su = s.setup;
type Timer = 'off' | '60' | '120' | '180';

const Label = ({ id, children }: { id?: string; children: string }) => (
  <h2 id={id} className="mono-label mb-2 mt-6 text-13 text-[var(--accent-tx)] first:mt-0">
    {children}
  </h2>
);

/** Setup step 2: packs, custom words, the turn timer, typed or spoken clues, one game or best of three. */
export function WordsRules({ draft, patch }: { draft: Draft; patch: (p: Partial<Draft>) => void }) {
  const customId = useId(),
    countId = useId(),
    packsId = useId();
  const typed = splitCustom(draft.custom);
  const good = cleanCustom(typed);
  const skipped = typed.length - good.length;
  const rules = draft.rules;
  const setRules = (r: Partial<Draft['rules']>) => patch({ rules: { ...rules, ...r } });
  const timer: Timer = rules.timerSec === null ? 'off' : (String(rules.timerSec) as Timer);
  return (
    <>
      <m.section {...stagger(0)} aria-labelledby={packsId}>
        <Label id={packsId}>{su.packs}</Label>
        <div className="grid grid-cols-2 gap-2.5">
          {PACK_IDS.map((id) => {
            const on = draft.packs.includes(id);
            return (
              <label
                key={id}
                className={`press flex min-h-14 cursor-pointer items-center gap-3 rounded-[20px] px-4 text-19 font-bold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)] ${on ? 'bg-word-card text-word-card-ink' : 'glass'}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    patch({
                      packs: on ? draft.packs.filter((p) => p !== id) : [...draft.packs, id],
                    })
                  }
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg [&_svg]:h-5 [&_svg]:w-5 ${on ? 'bg-team-sun text-team-sun-ink' : 'bg-word-card shadow-[inset_0_0_0_2px_var(--hairline-2)]'}`}
                >
                  {on && Icon.check}
                </span>
                {su.pack[id] ?? id}
              </label>
            );
          })}
        </div>
      </m.section>

      <m.section {...stagger(1)}>
        <Label>{su.custom}</Label>
        <label htmlFor={customId} className="sr-only">
          {su.custom}
        </label>
        <div className="mat-inp rounded-[20px] focus-within:shadow-[inset_0_0_0_2px_var(--focus)]">
          <textarea
            id={customId}
            value={draft.custom}
            onChange={(e) => patch({ custom: e.target.value })}
            rows={3}
            placeholder={su.customHint}
            aria-describedby={countId}
            autoCapitalize="words"
            spellCheck={false}
            className="block w-full resize-none bg-transparent px-4 pt-3 text-17 leading-snug outline-none placeholder:text-[var(--ph)] focus-visible:outline-none"
          />
          <p id={countId} className="px-4 pb-3 pt-1 text-15 text-[var(--tx2)]">
            {su.customCount(good.length)}
            {skipped > 0 && (
              <span className="block text-[var(--warn)]">{su.customSkipped(skipped)}</span>
            )}
          </p>
        </div>
      </m.section>

      <m.section {...stagger(2)}>
        <Label>{su.timer}</Label>
        <Seg<Timer>
          uid="ish-timer"
          label={su.timer}
          value={timer}
          onChange={(v) =>
            setRules({ timerSec: v === 'off' ? null : (Number(v) as 60 | 120 | 180) })
          }
          options={[
            { v: 'off', label: su.timerOff },
            { v: '60', label: su.timerMin(1) },
            { v: '120', label: su.timerMin(2) },
            { v: '180', label: su.timerMin(3) },
          ]}
          className="flex w-full [&>button]:flex-1"
        />
      </m.section>

      <m.section {...stagger(3)}>
        <Label>{su.entry}</Label>
        <Seg<'typed' | 'spoken'>
          uid="ish-entry"
          label={su.entry}
          value={rules.clueEntry}
          onChange={(v) => setRules({ clueEntry: v })}
          options={[
            { v: 'typed', label: su.typed },
            { v: 'spoken', label: su.spoken },
          ]}
          className="flex w-full [&>button]:flex-1"
        />
        <p className="mt-2 text-15 text-[var(--tx2)]">
          {rules.clueEntry === 'typed' ? su.typedNote : su.spokenNote}
        </p>
      </m.section>

      <m.section {...stagger(4)}>
        <Label>{su.bestOf}</Label>
        <Seg<'1' | '3'>
          uid="ish-best"
          label={su.bestOf}
          value={String(rules.bestOf) as '1' | '3'}
          onChange={(v) => setRules({ bestOf: v === '3' ? 3 : 1 })}
          options={[
            { v: '1', label: su.bestOfN(1) },
            { v: '3', label: su.bestOfN(3) },
          ]}
          className="flex w-full [&>button]:flex-1"
        />
      </m.section>
    </>
  );
}
