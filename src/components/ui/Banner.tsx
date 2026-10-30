import { AnimatePresence, motion } from 'framer-motion';
import type { Banner as BannerData } from '@/state/types';
import { SPRING } from './motion';

export function Banner({ banner }: { banner: BannerData | null }) {
  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12 }}
          transition={SPRING}
          className="glass glass-glow disp pointer-events-none absolute inset-x-5 top-[68px] z-[50] !rounded-[20px] p-3 text-center text-20 font-extrabold tracking-[-0.02em]"
        >
          {banner.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
