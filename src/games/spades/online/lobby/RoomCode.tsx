import { m } from 'framer-motion';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icons';
import { stagger } from '@/components/ui/stagger';
import { canShareLink, copyText, shareLink } from '@/lib/clip';
import { online as o } from '../../strings/online';

/** The table's join link, as the share card shows it and as it is sent. */
export const joinUrl = (code: string) => `${location.origin}/spades?join=${code}`;

/** The room code in large type, letters dropping in one after another, with Copy beside it. */
export function RoomCode({ code }: { code: string }) {
  const [said, setSaid] = useState('');
  const copy = async () => setSaid((await copyText(code)) ? o.lobby.copied : o.lobby.copyFailed);
  return (
    <div className="flex flex-col items-center">
      <div role="img" aria-label={o.lobby.codeAria(code)} className="flex justify-center gap-2">
        {code.split('').map((ch, i) => (
          <m.span
            key={`${code}${i}`}
            {...stagger(i, 0.06)}
            aria-hidden
            className="glass disp grid h-[66px] w-[54px] place-items-center text-36 font-bold"
          >
            {ch}
          </m.span>
        ))}
      </div>
      <div className="mt-1 flex flex-col items-center">
        <p className="text-center text-13 text-[var(--tx2)]">{o.lobby.codeHint}</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="press min-h-11 rounded-xl px-2 text-13 font-bold text-[var(--accent-tx)]"
        >
          {o.lobby.copyCode}
        </button>
      </div>
      <span role="status" className="sr-only">
        {said}
      </span>
    </div>
  );
}

/** For people in the room: the QR the server draws for this table, and the link to send. */
export function ShareCard({
  code,
  qrUrl,
  name,
}: {
  code: string;
  qrUrl: string | null;
  name: string;
}) {
  const [said, setSaid] = useState('');
  const [qrFailed, setQrFailed] = useState(false);
  const url = joinUrl(code);
  const share = async () => {
    if (canShareLink()) return shareLink(url, o.lobby.shareText(name));
    setSaid((await copyText(url)) ? o.lobby.copied : o.lobby.copyFailed);
  };
  return (
    <div className="glass flex items-center gap-3 p-3">
      {qrUrl && !qrFailed ? (
        <img
          src={qrUrl}
          alt={o.lobby.qrAlt(code)}
          width={76}
          height={76}
          onError={() => setQrFailed(true)}
          className="h-[76px] w-[76px] shrink-0 rounded-[10px] bg-card-face p-1.5"
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <b className="text-16">{o.lobby.scan}</b>
        <span className="text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">
          {o.lobby.orShare(url.replace(/^https?:\/\//, ''))}
        </span>
        <button
          type="button"
          onClick={() => void share()}
          className="press mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-xl text-14 font-bold text-[var(--accent-tx)]"
        >
          <span aria-hidden className="[&_svg]:h-4 [&_svg]:w-4">
            {Icon.share}
          </span>
          {canShareLink() ? o.lobby.shareLink : o.lobby.copyLink}
        </button>
        <span role="status" className="text-13 text-[var(--tx2)]">
          {said}
        </span>
      </div>
    </div>
  );
}
