import { AnimatePresence, motion } from 'framer-motion';
import type { Banner as BannerData } from '@/state/types';
import { SPRING } from './motion';

export function Banner({ banner }: { banner: BannerData | null }) {
  return (
    <>
      <div role="status" className="sr-only">
        {banner?.text}
      </div>
      {/* Anchor for the Scaffold to write the main pane's edges on; the banner never spans the controls pane. */}
      <div data-main-anchor className="pointer-events-none absolute inset-0 z-[50]">
        <AnimatePresence>
          {banner && (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: -24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={SPRING}
              className="glass glass-glow disp absolute left-[var(--main-x,1.25rem)] top-[calc(4.25rem+var(--sat))] w-[var(--main-w,calc(100%-2.5rem))] !rounded-[20px] p-3 text-center text-20 font-extrabold tracking-[-0.02em] land:top-[calc(3.5rem+var(--sat))]"
            >
              {banner.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
