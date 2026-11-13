import { m } from 'framer-motion';
import { useId, useRef, useState } from 'react';
import { useDialog } from '@/hooks/useDialog';
import { PrimaryButton } from './ui/PrimaryButton';
import { SPRING_POP } from './ui/motion';
import { t } from '@/strings';

/**
 * A new version is waiting: the app goes no further until the player reloads into it. There is no way out on
 * purpose (an installed iPhone app would otherwise keep the old version for days); every change is already saved.
 */
export function UpdateGate({ onReload }: { onReload: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId(),
    bodyId = useId();
  const [line] = useState(() => t.update.lines[Math.floor(Math.random() * t.update.lines.length)]);
  const [busy, setBusy] = useState(false);
  useDialog(ref, undefined);
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-7" data-update-gate>
      <m.div
        className="absolute inset-0 bg-shade/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <m.div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={SPRING_POP}
        className="glass relative w-full max-w-[22rem] !rounded-[28px] !bg-[var(--sheet-bg)] p-6 text-center"
      >
        <m.div
          aria-hidden
          className="mx-auto mb-4 grid h-[4.5rem] w-14 place-items-center rounded-[10px] border-[3px] border-[var(--card-back-edge)] bg-card-face text-36 text-card-ink shadow-[0_0_32px_var(--glow)]"
          initial={{ rotate: -14, y: -8 }}
          animate={{ rotate: [-14, 8, -4, 0], y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          ♠
        </m.div>
        <p className="mb-1 text-13 font-bold uppercase tracking-[0.14em] text-[var(--accent-tx)]">
          {t.update.kicker}
        </p>
        <h2
          id={titleId}
          className="disp mb-2 text-24 font-extrabold leading-tight tracking-[-0.02em] [text-wrap:balance]"
        >
          {line.title}
        </h2>
        <p id={bodyId} className="mb-6 text-15 leading-snug text-[var(--tx2)] [text-wrap:pretty]">
          {line.body}
        </p>
        <PrimaryButton
          className="!h-[52px] w-full !text-16"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            onReload();
          }}
        >
          {busy ? t.update.reloading : t.update.reload}
        </PrimaryButton>
      </m.div>
    </div>
  );
}
