import { m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { canShareFiles, copySummary, shareScores } from '@/hooks/useShare';
import { drawShareCanvas } from '@/lib/shareImage';
import { shareCard } from '@/games/kachuful/lib/finalStandings';
import { shareText } from '@/games/kachuful/lib/shareText';
import { useApp } from '@/games/kachuful/state/store';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ShareLinks } from '@/games/kachuful/components/ShareLinks';
import { t } from '@/strings';

export default function ShareBody() {
  const { state, actions } = useApp();
  const [img, setImg] = useState<{ url: string; blob: Blob } | null>(null);
  const text = shareText(state.game);
  useEffect(() => {
    let live = true;
    void drawShareCanvas(shareCard(state.game)).then((c) =>
      c.toBlob((blob) => {
        if (live && blob) setImg({ url: c.toDataURL('image/png'), blob });
      }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draws the final board once
  }, []);
  const direct = img ? canShareFiles(new File([img.blob], 'x.png', { type: 'image/png' })) : false;
  const share = async () => {
    if (!img) return;
    const r = await shareScores(img.blob, text);
    if (r === 'saved') actions.say(t.toasts.imageSaved);
    else if (r === 'failed') actions.say(t.toasts.shareFailed);
  };
  return (
    <div className="text-center">
      {img && (
        <m.img
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          src={img.url}
          alt={t.sheets.imageAlt}
          className="mx-auto max-h-[46dvh] max-w-full rounded-2xl shadow-[0_24px_60px_-12px_color-mix(in_srgb,var(--shade)_70%,transparent)]"
        />
      )}
      <div className="mt-4 flex gap-2.5">
        <PrimaryButton
          tone="glass"
          className="!h-[52px] flex-1 !text-16"
          disabled={!img}
          onClick={async () =>
            actions.say((await copySummary(text)) ? t.toasts.copied : t.toasts.copyFailed)
          }
        >
          {t.sheets.copyText}
        </PrimaryButton>
        <PrimaryButton className="!h-[52px] flex-1 !text-16" disabled={!img} onClick={share}>
          {direct ? t.sheets.shareDirect : t.sheets.shareSave}
        </PrimaryButton>
      </div>
      <ShareLinks />
    </div>
  );
}
