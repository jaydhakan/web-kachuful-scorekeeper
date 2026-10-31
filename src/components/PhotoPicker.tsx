import { useRef, useState } from 'react';
import { squarePhoto } from '@/lib/photo';
import { keepPlayer } from '@/state/registry';
import { useApp } from '@/state/store';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import { usePhoto, type Face } from '@/components/ui/Avatar';
import { t } from '@/strings';

const x = t.hub.photo;

const photoError = (e: unknown) => {
  if (!(e instanceof ApiError)) return x.unreadable;
  if (e.offline) return x.offline;
  return x.errors[e.code] ?? t.hub.auth.errors.server;
};

/**
 * Add, change or remove a player's photo (camera or files, as the phone offers). The app squares and shrinks it,
 * the server keeps it; offline it says photos need a connection. Only shown to people who may change it.
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
  const pick = (file: File | undefined) =>
    file && run(async () => (await ep.setPhoto(p.id, await squarePhoto(file))).photoUrl, x.saved);
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
          className="glass min-h-11 rounded-xl px-3 text-14 font-bold disabled:opacity-50"
        >
          📷 {busy ? x.busy : url ? x.change : x.add}
        </button>
        {url && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(async () => (await ep.deletePhoto(p.id), null), x.removed)}
            className="min-h-11 rounded-xl px-3 text-14 font-bold text-[var(--accent)] disabled:opacity-50"
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
    </div>
  );
}
