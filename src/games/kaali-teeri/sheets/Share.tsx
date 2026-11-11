import { m } from 'framer-motion';
import { useEffect, useState } from 'react';
import { doneHands } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { shareCard, shareText } from '@/games/kaali-teeri/lib/share';
import { end } from '@/games/kaali-teeri/strings/end';
import { canShareFiles, copySummary, shareScores } from '@/hooks/useShare';
import { drawShareCanvas } from '@/lib/shareImage';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { t } from '@/strings';
import { ShareLinks } from './ShareLinks';

type Img = { url: string; blob: Blob } | 'failed' | null;

/** The scores card and a text summary; live and recap links go under the buttons, as in Kachuful's sheet. */
export default function Share() {
  const { state, actions } = useKt();
  const g = state.game;
  const [img, setImg] = useState<Img>(null);
  const ready = !!g && doneHands(g).length > 0;
  useEffect(() => {
    if (!g || !ready) return;
    let live = true;
    drawShareCanvas(shareCard(g))
      .then((c) =>
        c.toBlob((blob) => {
          if (live) setImg(blob ? { url: c.toDataURL('image/png'), blob } : 'failed');
        }),
      )
      .catch(() => live && setImg('failed'));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draws the board as the sheet opened
  }, []);
  if (!g || !ready)
    return <p className="py-6 text-center text-16 text-[var(--tx2)]">{end.share.empty}</p>;
  const text = shareText(g);
  const pic = img && img !== 'failed' ? img : null;
  const direct = pic ? canShareFiles(new File([pic.blob], 'x.png', { type: 'image/png' })) : false;
  const share = async () => {
    if (!pic) return;
    const r = await shareScores(pic.blob, text);
    if (r === 'saved') actions.say(t.toasts.imageSaved);
    else if (r === 'failed') actions.say(t.toasts.shareFailed);
  };
  return (
    <div className="text-center">
      {pic ? (
        <m.img
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          src={pic.url}
          alt={t.sheets.imageAlt}
          className="mx-auto max-h-[46dvh] max-w-full rounded-2xl shadow-[0_24px_60px_-12px_color-mix(in_srgb,var(--shade)_70%,transparent)]"
        />
      ) : img === 'failed' ? (
        <p role="alert" className="px-2 py-6 text-15 text-[var(--tx2)]">
          {end.share.drawFailed}
        </p>
      ) : (
        // The card's own 4:5 shape, so the buttons don't jump when it arrives.
        <div
          role="status"
          aria-label={end.share.drawing}
          className="mx-auto aspect-[4/5] max-h-[46dvh] w-full max-w-[min(100%,calc(46dvh*0.8))] rounded-2xl bg-ov/[.06]"
        />
      )}
      <div className="mt-4 flex gap-2.5">
        <PrimaryButton
          tone="glass"
          className="!h-[52px] flex-1 !text-16"
          onClick={async () =>
            actions.say((await copySummary(text)) ? t.toasts.copied : t.toasts.copyFailed)
          }
        >
          {t.sheets.copyText}
        </PrimaryButton>
        <PrimaryButton className="!h-[52px] flex-1 !text-16" disabled={!pic} onClick={share}>
          {direct ? t.sheets.shareDirect : t.sheets.shareSave}
        </PrimaryButton>
      </div>
      <ShareLinks g={g} />
    </div>
  );
}
