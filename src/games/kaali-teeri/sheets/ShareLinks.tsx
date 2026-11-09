import { m, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { doneHands, type KtGame } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { online } from '@/games/kaali-teeri/strings/online';
import { canShareLink, copyText, shareLink } from '@/lib/clip';
import { dayLabel, timeLabel } from '@/lib/dates';
import { archive } from '@/state/archive';
import { useArchive } from '@/state/useArchive';
import { errorText } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import { signedInAs, useSession } from '@/sync/session';
import type { LinkResp } from '@/sync/types';
import { ToggleTrack } from '@/components/ui/Toggle';

const x = online.links;
type Kind = 'live' | 'recap';
interface KeptLink {
  url: string;
  qr: string;
  reactions: boolean;
  membersOnly: boolean;
  expiresAt: number | null;
}
const kept = (r: LinkResp): KeptLink => ({
  // The server's links point at the real site; the paths work on whichever origin serves this app.
  url: location.origin + new URL(r.url).pathname,
  qr: r.qrSvgUrl,
  reactions: r.reactions ?? true,
  membersOnly: r.membersOnly ?? false,
  expiresAt: r.expiresAt ?? null,
});
const cacheKey = (g: KtGame) => 'links:' + g.syncId;
const BTN = 'press min-h-11 rounded-xl px-4 text-15 font-bold';

/**
 * Recap and live links for the game on the table, signed in. Share links are one API for every game
 * (`/api/games/{id}/links`); they need the game on the server, so they wait for its first sync.
 */
export function ShareLinks({ g }: { g: KtGame }) {
  const { actions } = useKt();
  const signedIn = !!signedInAs(useSession());
  const rec = useArchive((a) => a.get('ktGames', g.syncId));
  const rm = useReducedMotion();
  const [links, setLinks] = useState<Partial<Record<Kind, KeptLink>>>(
    () => (archive.get('cache', cacheKey(g))?.value as never) ?? {},
  );
  const [busy, setBusy] = useState<Kind | null>(null);
  const fail = (e: unknown) => actions.say(errorText(e, x.errors, x.failed));
  const save = (v: typeof links) => {
    setLinks(v);
    archive.put('cache', { key: cacheKey(g), value: v, fetchedAt: Date.now() });
  };
  const make = async (k: Kind) => {
    setBusy(k);
    try {
      save({ ...links, [k]: kept(await ep.link(g.syncId, k)) });
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };
  const setLive = async (patch: { reactions?: boolean; membersOnly?: boolean }) => {
    try {
      save({ ...links, live: kept(await ep.updateLiveLink(g.syncId, patch)) });
    } catch (e) {
      fail(e);
    }
  };
  const revoke = async (k: Kind) => {
    try {
      await ep.revokeLink(g.syncId, k);
      const n = { ...links };
      delete n[k];
      save(n);
      actions.say(x.revoked);
    } catch (e) {
      fail(e);
    }
  };

  const synced = !!rec?.account && rec.syncedRev !== undefined;
  const note = !signedIn
    ? x.signedOut
    : !doneHands(g).length
      ? x.noHand
      : !synced
        ? navigator.onLine
          ? x.notSynced
          : x.offline
        : null;
  return (
    <section aria-labelledby="kt-links" className="mt-6 text-left">
      <h3
        id="kt-links"
        className="mb-2 text-13 font-bold uppercase tracking-[0.12em] text-[var(--tx2)]"
      >
        {x.title}
      </h3>
      {note ? (
        <p className="text-14 text-[var(--tx2)]">{note}</p>
      ) : (
        (['recap', 'live'] as Kind[]).map((k) => {
          const l = links[k];
          const name = k === 'live' ? x.live : x.recap;
          return (
            <div key={k} className="glass mb-2 p-4">
              <div className="text-16 font-bold">{name}</div>
              <p className="mb-3 text-14 text-[var(--tx2)]">
                {k === 'live' ? x.liveBody : x.recapBody}
              </p>
              {!l ? (
                <button
                  type="button"
                  disabled={busy === k}
                  aria-label={`${x.make}: ${name}`}
                  onClick={() => void make(k)}
                  className={`${BTN} bg-[var(--accent)] text-ink-on-accent disabled:opacity-50`}
                >
                  {x.make}
                </button>
              ) : (
                <>
                  {k === 'live' && (
                    <m.img
                      src={l.qr}
                      alt={x.qr(name)}
                      width={176}
                      height={176}
                      initial={rm ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mx-auto mb-3 h-44 w-44 rounded-xl bg-ov p-1.5"
                    />
                  )}
                  <code className="mb-3 block select-all break-all rounded-xl bg-shade/30 p-2.5 text-13">
                    {l.url}
                  </code>
                  {k === 'live' && (
                    <div className="mb-3 flex flex-col">
                      {(
                        [
                          ['reactions', online.links.reactionsToggle, l.reactions],
                          ['membersOnly', online.links.membersToggle, l.membersOnly],
                        ] as const
                      ).map(([key, label, on]) => (
                        <button
                          key={key}
                          type="button"
                          role="switch"
                          aria-checked={on}
                          onClick={() => void setLive({ [key]: !on })}
                          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl text-left"
                        >
                          <span className="text-15 font-medium">{label}</span>
                          <ToggleTrack on={on} />
                        </button>
                      ))}
                      <p className="mt-1 text-13 text-[var(--tx2)]">
                        {l.expiresAt
                          ? x.expires(`${dayLabel(l.expiresAt)} ${timeLabel(l.expiresAt)}`)
                          : x.expiresSoon}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => actions.say((await copyText(l.url)) ? x.copied : l.url)}
                      className={`${BTN} bg-[var(--accent)] text-ink-on-accent`}
                    >
                      {x.copy}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(l.url)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="glass inline-flex min-h-11 items-center rounded-xl px-4 text-15 font-bold"
                    >
                      {x.whatsapp}
                    </a>
                    {canShareLink() && (
                      <button
                        type="button"
                        onClick={() => void shareLink(l.url)}
                        className={`${BTN} glass`}
                      >
                        {x.share}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={x.revokeLabel(name)}
                      onClick={() => void revoke(k)}
                      className="press min-h-11 rounded-xl px-3 text-15 font-bold text-[var(--neg)]"
                    >
                      {x.revoke}
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}
