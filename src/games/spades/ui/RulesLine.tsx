import { m } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { SpRules } from '../domain';
import { rulesLine as s, rulesSummary } from '../strings/online';

export interface RulesLineProps {
  rules: SpRules;
  /** Online only; table mode has no timer. */
  online: boolean;
  /** "Edit rules ›" for the host or the scorer, "View ›" for a guest. */
  editable: boolean;
  onOpen: () => void;
}

const OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * The one-line rules summary ("200 points · Nil · 30 s turns") with its Edit or View link. A change flashes the line
 * (a short swell and a glow; reduced motion keeps only the glow), so every phone in the lobby sees it.
 */
export default function RulesLine({ rules, online, editable, onOpen }: RulesLineProps) {
  const summary = rulesSummary(rules, online);
  const [flash, setFlash] = useState(0);
  const last = useRef(summary);
  useEffect(() => {
    if (last.current === summary) return;
    last.current = summary;
    setFlash((n) => n + 1);
  }, [summary]);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={s.aria(summary, editable)}
      data-flash={flash || undefined}
      className="glass press relative isolate flex min-h-[52px] w-full overflow-hidden text-left"
    >
      {flash > 0 && (
        <m.span
          key={`glow${flash}`}
          aria-hidden
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: OUT }}
          className="pointer-events-none absolute inset-0 -z-10 bg-[color-mix(in_srgb,var(--accent)_22%,transparent)]"
        />
      )}
      <m.span
        key={`row${flash}`}
        aria-hidden
        initial={flash ? { scale: 1.025 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: 0.32, ease: OUT }}
        className="flex w-full items-center gap-2.5 px-3.5 py-2"
      >
        <span className="min-w-0 flex-1 text-14 font-semibold leading-[1.35] text-[var(--tx2)]">
          {summary}
        </span>
        <span className="shrink-0 whitespace-nowrap text-14 font-bold text-[var(--accent-tx)]">
          {editable ? s.edit : s.view} ›
        </span>
      </m.span>
    </button>
  );
}
