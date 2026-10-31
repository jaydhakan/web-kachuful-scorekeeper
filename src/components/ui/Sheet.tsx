import { motion, useDragControls, useReducedMotion, type Variants } from 'framer-motion';
import { useId, useRef, type ReactNode } from 'react';
import { useDialog } from '@/hooks/useDialog';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MQ } from '@/theme/breakpoints';
import { EASE, SPRING_POP, SPRING_SHEET } from './motion';
import { Icon } from './Icons';
import { IconButton } from './IconButton';
import { t } from '@/strings';

/** What a sheet becomes once there is room (tablet and up): a centred modal, a wide one, or a side panel. */
export type Presentation = 'modal' | 'board' | 'panel';

interface SheetProps {
  title: string;
  onClose: () => void;
  /** On a phone, a sheet that fills the height below the status bar. */
  full?: boolean;
  /** How it looks from tablet width up; a bottom sheet below that. */
  roomy?: Presentation;
  children: ReactNode;
}

const VARIANTS = {
  sheet: { hidden: { y: '100%' }, shown: { y: 0 } },
  modal: { hidden: { opacity: 0, scale: 0.96 }, shown: { opacity: 1, scale: 1 } },
  panel: { hidden: { x: '100%' }, shown: { x: 0 } },
  reduced: { hidden: { opacity: 0 }, shown: { opacity: 1 } },
} satisfies Record<string, Variants>;

const TRANSITION = {
  sheet: SPRING_SHEET,
  panel: SPRING_SHEET,
  modal: SPRING_POP,
  reduced: { duration: 0.2, ease: EASE },
};

// Layout is CSS only (`roomy:`); each presentation spells out how the bottom-anchored panel is released.
const WRAP = {
  modal: 'roomy:grid roomy:place-items-center roomy:p-4',
  board: 'roomy:grid roomy:place-items-center roomy:p-4',
  panel: 'roomy:flex roomy:justify-end',
};
const PANEL = {
  modal:
    'roomy:relative roomy:inset-auto roomy:w-[28rem] roomy:max-w-full roomy:max-h-[86dvh] roomy:rounded-[28px]',
  board:
    'roomy:relative roomy:inset-auto roomy:w-[min(92vw,64rem)] roomy:max-h-[86dvh] roomy:rounded-[28px]',
  panel:
    'roomy:relative roomy:inset-auto roomy:h-full roomy:max-h-none roomy:w-[28rem] roomy:max-w-full roomy:rounded-none roomy:rounded-l-[28px] roomy:pr-[var(--sar)] roomy:pt-[var(--sat)]',
};

/** Bottom sheet with velocity-projected dismissal on a phone; a modal or side panel where there is room. */
export function Sheet({ title, onClose, full, roomy = 'modal', children }: SheetProps) {
  const controls = useDragControls();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const hasRoom = useMediaQuery(MQ.roomy);
  const reduced = useReducedMotion();
  const kind = reduced ? 'reduced' : hasRoom ? (roomy === 'panel' ? 'panel' : 'modal') : 'sheet';
  useDialog(ref, onClose);
  return (
    <div className={`absolute inset-0 z-[60] ${WRAP[roomy]}`}>
      <motion.div
        className="absolute inset-0 bg-black/55"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        onClick={onClose}
      />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        // Dragging down only dismisses the bottom sheet.
        drag={hasRoom ? false : 'y'}
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.6 }}
        onDragEnd={(_e, i) => {
          if (i.offset.y + i.velocity.y * 0.25 > 150) onClose();
        }}
        variants={VARIANTS[kind]}
        initial="hidden"
        animate="shown"
        exit="hidden"
        transition={TRANSITION[kind]}
        className={`absolute inset-x-0 bottom-0 flex flex-col rounded-t-[28px] bg-sheet/95 shadow-[0_-24px_80px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.08)] [backdrop-filter:blur(30px)_saturate(160%)] ${full ? 'top-[calc(36px+var(--sat))]' : 'max-h-[90%]'} ${PANEL[roomy]}`}
      >
        <div
          onPointerDown={(e) => controls.start(e)}
          className="shrink-0 cursor-grab touch-none px-5 pb-1.5 pt-2.5 roomy:cursor-auto roomy:touch-auto"
        >
          <div className="mx-auto mb-3 h-[5px] w-11 rounded-full bg-white/25 roomy:hidden" />
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="disp text-26 font-extrabold tracking-[-0.03em]">
              {title}
            </h2>
            <IconButton label={t.common.close} onClick={onClose} skipInitialFocus className="-mr-2">
              {Icon.close}
            </IconButton>
          </div>
        </div>
        <div
          tabIndex={0}
          role="region"
          aria-labelledby={titleId}
          className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,var(--sab))] pt-2"
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
