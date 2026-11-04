import { m } from 'framer-motion';
import { useId, useRef } from 'react';
import { useDialog } from '@/hooks/useDialog';
import { PrimaryButton } from './PrimaryButton';
import { SPRING_POP } from './motion';
import { t } from '@/strings';

interface ModalProps {
  text: string;
  /** A quieter line under the question. */
  body?: string;
  ok: string;
  danger?: boolean;
  /** Label for the secondary button. */
  cancel?: string;
  /** A locked modal ignores backdrop taps, so a choice must be made. */
  locked?: boolean;
  /** A third, destructive choice; the buttons then stack, the safe choice first. */
  alt?: { label: string; onClick: () => void };
  onOk: () => void;
  onCancel: () => void;
}

export function Modal({
  text,
  body,
  ok,
  danger,
  cancel = t.common.cancel,
  locked,
  alt,
  onOk,
  onCancel,
}: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const textId = useId();
  useDialog(ref, locked ? undefined : onCancel);
  return (
    <div className="absolute inset-0 z-[65] grid place-items-center p-7">
      <m.div
        className="absolute inset-0 bg-shade/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={locked ? undefined : onCancel}
      />
      <m.div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={textId}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={SPRING_POP}
        className="glass relative w-full max-w-[22rem] !rounded-[28px] !bg-[var(--sheet-bg)] p-6"
      >
        <p id={textId} className="mb-5 text-19 font-medium leading-snug tracking-[-0.012em]">
          {text}
        </p>
        {body && <p className="-mt-3 mb-5 text-15 text-[var(--tx2)]">{body}</p>}
        {alt ? (
          <div className="flex flex-col gap-2.5">
            <PrimaryButton onClick={onOk} className="!h-[52px] !text-16">
              {ok}
            </PrimaryButton>
            <PrimaryButton
              tone="glass"
              onClick={alt.onClick}
              className="!h-[52px] !text-16 !text-[var(--danger)]"
            >
              {alt.label}
            </PrimaryButton>
            <PrimaryButton tone="glass" onClick={onCancel} className="!h-[52px] !text-16">
              {cancel}
            </PrimaryButton>
          </div>
        ) : (
          <div className="flex gap-2.5">
            <PrimaryButton tone="glass" onClick={onCancel} className="!h-[52px] flex-1 !text-16">
              {cancel}
            </PrimaryButton>
            <PrimaryButton
              tone={danger ? 'danger' : 'accent'}
              onClick={onOk}
              className="!h-[52px] flex-1 !text-16"
            >
              {ok}
            </PrimaryButton>
          </div>
        )}
      </m.div>
    </div>
  );
}
