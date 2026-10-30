import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { drawShareCanvas } from '@/lib/shareImage';
import { useApp } from '@/state/store';

export default function ShareBody() {
  const { state } = useApp();
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void drawShareCanvas(state.game).then((c) => {
      if (!live) return;
      setImg(c.toDataURL('image/png'));
      c.toBlob(async (b) => {
        try {
          if (!b) return;
          const f = new File([b], 'kachuful-scores.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [f] }))
            await navigator.share({ files: [f], title: 'Kachuful scores' });
        } catch {
          /* dismissed or blocked */
        }
      });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draws the final board once
  }, []);
  return (
    <div className="text-center">
      {img && (
        <motion.img
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          src={img}
          alt="Final scores card"
          className="mx-auto max-h-[56dvh] max-w-full rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,.7)]"
        />
      )}
      <p className="mt-3 text-14 text-[var(--tx2)]">
        Press and hold the image to save or share it.
      </p>
    </div>
  );
}
