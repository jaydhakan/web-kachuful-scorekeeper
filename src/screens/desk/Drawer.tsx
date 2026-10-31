import { motion, useReducedMotion } from 'framer-motion';
import { useId, useRef, type ReactNode } from 'react';
import { useDialog } from '@/hooks/useDialog';
import { Icon } from '@/components/ui/Icons';
import { EASE, SPRING_POP, SPRING_SHEET } from '@/components/ui/motion';
import { Eyebrow, GhostButton, Kbd } from './DeskParts';
import { t } from '@/strings';

const Backdrop = ({ onClose }: { onClose: () => void }) => (
  <motion.div
    className="absolute inset-0 bg-black/55"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3, ease: EASE }}
    onClick={onClose}
  />
);

interface DrawerProps {
  eyebrow: ReactNode;
  title: ReactNode;
  closeLabel?: string;
  onClose: () => void;
  children: ReactNode;
  foot?: ReactNode;
}

/** A panel that slides in from the right over any screen: focus trap, Escape, focus back to the opener. */
export function Drawer({ eyebrow, title, closeLabel, onClose, children, foot }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const rm = useReducedMotion();
  useDialog(ref, onClose);
  return (
    <div className="absolute inset-0 z-[60] flex justify-end">
      <Backdrop onClose={onClose} />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={rm ? { opacity: 0 } : { x: '100%' }}
        animate={rm ? { opacity: 1 } : { x: 0 }}
        exit={rm ? { opacity: 0 } : { x: '100%' }}
        transition={rm ? { duration: 0.2, ease: EASE } : SPRING_SHEET}
        className="relative flex h-full w-[32.5rem] max-w-full flex-col gap-4 rounded-l-[28px] bg-sheet/95 px-8 pb-[max(1.75rem,var(--sab))] pr-[max(2rem,var(--sar))] pt-[calc(1.75rem+var(--sat))] shadow-[-24px_0_80px_rgba(0,0,0,.6),inset_1px_0_0_rgba(255,255,255,.08)] [backdrop-filter:blur(30px)_saturate(160%)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2
              id={titleId}
              className="disp text-36 font-extrabold leading-[1.1] tracking-[-0.03em]"
            >
              {title}
            </h2>
          </div>
          <GhostButton
            icon
            aria-label={closeLabel ?? t.common.close}
            data-skip-initial-focus
            onClick={onClose}
          >
            {Icon.close}
          </GhostButton>
        </div>
        <div
          tabIndex={0}
          role="region"
          aria-labelledby={titleId}
          className="scroll-thin -mx-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 focus-visible:[outline-offset:-2px]"
        >
          {children}
        </div>
        {foot}
      </motion.div>
    </div>
  );
}

/** The `?` sheet: every shortcut in one list. */
export function KeysModal({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const rm = useReducedMotion();
  useDialog(ref, onClose);
  return (
    <div className="absolute inset-0 z-[64] grid place-items-center p-6">
      <Backdrop onClose={onClose} />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={rm ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12 }}
        animate={rm ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={rm ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        transition={rm ? { duration: 0.2, ease: EASE } : SPRING_POP}
        className="glass glass-glow relative w-[34rem] max-w-full !rounded-[28px] !bg-sheet/95 p-7"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="disp text-28 font-extrabold tracking-[-0.03em]">
            {t.desk.keys.title}
          </h2>
          <GhostButton icon aria-label={t.common.close} data-skip-initial-focus onClick={onClose}>
            {Icon.close}
          </GhostButton>
        </div>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-3 text-16">
          {t.desk.keys.list.map(([k, what]) => (
            <div key={k} className="contents">
              <dt className="justify-self-end">
                <Kbd className="!inline-grid h-8 min-w-8 bg-white/[.12] px-2.5 text-15">{k}</Kbd>
              </dt>
              <dd className="text-[var(--tx2)]">{what}</dd>
            </div>
          ))}
        </dl>
      </motion.div>
    </div>
  );
}
