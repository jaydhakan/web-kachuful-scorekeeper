import { m, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { doneRounds } from '@/games/kachuful/domain';
import { dayLabel, timeLabel } from '@/lib/dates';
import type { LinkResp } from '@/sync/types';
import { ToggleTrack } from '@/components/ui/Toggle';
import { canShareLink, copyText, shareLink } from '@/lib/clip';
import { archive } from '@/state/archive';
import { useApp } from '@/games/kachuful/state/store';
import { useArchive } from '@/state/useArchive';
import { ep } from '@/sync/endpoints';
import { authError } from '@/platform/pages/AuthPages';
import { t } from '@/strings';

const x = t.hub.share;
type Kind = 'live' | 'recap';
/** A link as kept for this game: where it points, and a live link's settings. */
export interface KeptLink {
  url: string;
  qr: string;
  token?: string;
  reactions?: boolean;
  membersOnly?: boolean;
  expiresAt?: number | null;
}
const kept = (r: LinkResp): KeptLink => ({
  // The server's links point at the real site; the paths work on whichever origin serves this app.
  url: location.origin + new URL(r.url).pathname,
  qr: r.qrSvgUrl,
  token: r.token,
  reactions: r.reactions ?? true,
  membersOnly: r.membersOnly ?? false,
  expiresAt: r.expiresAt ?? null,
});

/** Recap and live links for the current game, with a QR code; they need the game on the server. */
export function ShareLinks() {
  const { state, actions } = useApp();
  const g = state.game;
  const rec = useArchive((a) => a.get('games', g.syncId));
  const rm = useReducedMotion();
  const [links, setLinks] = useState<Partial<Record<Kind, KeptLink>>>(
    () => (archive.get('cache', 'links:' + g.syncId)?.value as never) ?? {},
  );
  const [busy, setBusy] = useState<Kind | null>(null);
  if (!state.session) return <p className="mt-6 text-14 text-[var(--tx2)]">{x.signedOut}</p>;
  const synced = rec?.syncedRev !== undefined;
  const save = (v: typeof links) => {
    setLinks(v);
    archive.put('cache', { key: 'links:' + g.syncId, value: v, fetchedAt: Date.now() });
  };
  const make = async (k: Kind) => {
    setBusy(k);
    try {
      save({ ...links, [k]: kept(await ep.link(g.syncId, k)) });
    } catch (e) {
      actions.say(authError(e));
    } finally {
      setBusy(null);
    }
  };
  const setLive = async (patch: { reactions?: boolean; membersOnly?: boolean }) => {
    try {
      save({ ...links, live: kept(await ep.updateLiveLink(g.syncId, patch)) });
    } catch (e) {
      actions.say(authError(e));
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
      actions.say(authError(e));
    }
  };
  return (
    <section aria-label={x.links} className="mt-6 text-left">
      <h3 className="mb-2 text-13 font-bold uppercase tracking-[0.12em] text-[var(--tx2)]">
        {x.links}
      </h3>
      {!synced ? (
        <p className="text-14 text-[var(--tx2)]">
          {!doneRounds(g).length ? x.noRound : navigator.onLine ? x.notSynced : x.offline}
        </p>
      ) : (
        (['recap', 'live'] as Kind[]).map((k) => {
          const l = links[k];
          return (
            <div key={k} className="glass mb-2 p-4">
              <div className="text-16 font-bold">{k === 'live' ? x.live : x.recap}</div>
              <p className="mb-3 text-14 text-[var(--tx2)]">
                {k === 'live' ? x.liveBody : x.recapBody}
              </p>
              {!l ? (
                <button
                  type="button"
                  disabled={busy === k}
                  onClick={() => void make(k)}
                  className="press min-h-11 rounded-xl bg-[var(--accent)] px-4 text-15 font-bold text-ink-on-accent disabled:opacity-50"
                >
                  {x.make}
                </button>
              ) : (
                <>
                  {k === 'live' && (
                    <m.img
                      src={l.qr}
                      alt={x.qr(x.live)}
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
                          ['reactions', x.reactionsToggle, x.reactionsHint, l.reactions ?? true],
                          ['membersOnly', x.membersToggle, x.membersHint, l.membersOnly ?? false],
                        ] as const
                      ).map(([key, label, hint, on]) => (
                        <m.button
                          key={key}
                          type="button"
                          role="switch"
                          aria-checked={on}
                          whileTap="press"
                          onClick={() => void setLive({ [key]: !on })}
                          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl text-left"
                        >
                          <span className="flex flex-col">
                            <span className="text-15 font-medium">{label}</span>
                            <span className="text-13 text-[var(--tx2)]">{hint}</span>
                          </span>
                          <ToggleTrack on={on} />
                        </m.button>
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
                      className="press min-h-11 rounded-xl bg-[var(--accent)] px-4 text-15 font-bold text-ink-on-accent"
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
                        className="press glass min-h-11 rounded-xl px-4 text-15 font-bold"
                      >
                        {x.share}
                      </button>
                    )}
                    <button
                      type="button"
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
