import { AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import { encodeCrop, loadPhoto, type Crop, type Photo } from '@/lib/photo';
import { keepPlayer } from '@/state/registry';
import { useApp } from '@/state/store';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import { usePhoto, type Face } from '@/components/ui/Avatar';
import { PhotoCropper } from './PhotoCropper';
import { t } from '@/strings';
import { icon } from './ui/IconsMore';

const x = t.hub.photo;

const photoError = (e: unknown) => {
  if (!(e instanceof ApiError)) return x.unreadable;
  if (e.offline) return x.offline;
  return x.errors[e.code] ?? t.hub.auth.errors.server;
};

/**
 * Add, change or remove a player's photo (camera or files, as the phone offers). The person frames it in a crop
 * step, the app shrinks it, the server keeps it; offline it says photos need a connection. Only shown to people who may change it.
 */
export function PhotoPicker({
  p,
  className = '',
}: {
  p: Face & { id: string; displayName: string };
  className?: string;
}) {
  const { actions } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [framing, setFraming] = useState<Photo | null>(null);
  const url = usePhoto(p);
  const run = async (f: () => Promise<string | null>, done: string) => {
    setBusy(true);
    setErr('');
    try {
      keepPlayer(p.id, { photoUrl: await f() });
      actions.say(done);
    } catch (e) {
      setErr(photoError(e));
    } finally {
      setBusy(false);
    }
  };
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setErr('');
    try {
      setFraming(await loadPhoto(file));
    } catch {
      setErr(x.unreadable);
    }
  };
  const use = async (photo: Photo, crop: Crop) => {
    await run(
      async () => (await ep.setPhoto(p.id, await encodeCrop(photo, crop))).photoUrl,
      x.saved,
    );
    setFraming(null);
  };
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/*"
          tabIndex={-1}
          aria-label={x.choose(p.displayName)}
          className="sr-only"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="press glass min-h-11 rounded-xl px-3 text-14 font-bold disabled:opacity-50"
        >
          {icon('camera')} {busy ? x.busy : url ? x.change : x.add}
        </button>
        {url && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(async () => (await ep.deletePhoto(p.id), null), x.removed)}
            className="press min-h-11 rounded-xl px-3 text-14 font-bold text-[var(--accent)] disabled:opacity-50"
          >
            {x.remove}
          </button>
        )}
      </div>
      {err && (
        <p role="alert" className="text-13 text-[var(--warn)]">
          {err}
        </p>
      )}
      <AnimatePresence>
        {framing && (
          <PhotoCropper
            photo={framing}
            busy={busy}
            onUse={(photo, crop) => void use(photo, crop)}
            onCancel={() => setFraming(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
