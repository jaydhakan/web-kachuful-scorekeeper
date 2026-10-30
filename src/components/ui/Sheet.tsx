import { motion, useDragControls } from 'framer-motion';
import { useId, useRef, type ReactNode } from 'react';
import { useDialog } from '@/hooks/useDialog';
import { EASE } from './motion';
import { Icon } from './Icons';
import { IconButton } from './IconButton';

interface SheetProps {
  title: string;
  onClose: () => void;
  full?: boolean;
  children: ReactNode;
}

/** Bottom sheet with velocity-projected dismissal. */
export function Sheet({ title, onClose, full, children }: SheetProps) {
  const controls = useDragControls();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialog(ref, onClose);
  return (
    <div className="absolute inset-0 z-[60]">
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
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.6 }}
        onDragEnd={(_e, i) => {
          if (i.offset.y + i.velocity.y * 0.25 > 150) onClose();
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 38 }}
        className={`absolute inset-x-0 bottom-0 flex flex-col rounded-t-[28px] bg-sheet/95 shadow-[0_-24px_80px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.08)] [backdrop-filter:blur(30px)_saturate(160%)] ${full ? 'top-9' : 'max-h-[90%]'}`}
      >
        <div
          onPointerDown={(e) => controls.start(e)}
          className="shrink-0 cursor-grab touch-none px-5 pb-1.5 pt-2.5"
        >
          <div className="mx-auto mb-3 h-[5px] w-11 rounded-full bg-white/25" />
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="disp text-26 font-extrabold tracking-[-0.03em]">
              {title}
            </h2>
            <IconButton label="Close" onClick={onClose} className="-mr-2">
              {Icon.close}
            </IconButton>
          </div>
        </div>
        <div className="no-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-2">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
