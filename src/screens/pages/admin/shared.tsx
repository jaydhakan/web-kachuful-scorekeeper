import { useCallback, useEffect, useState } from 'react';
import { canShareLink, copyText, shareLink } from '@/lib/clip';
import { useApp } from '@/state/store';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import type { Player } from '@/sync/types';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { authError } from '../AuthPages';
import { t } from '@/strings';

export const ad = t.hub.admin;

export const adminError = (e: unknown) =>
  e instanceof ApiError && ad.errors[e.code] ? ad.errors[e.code] : authError(e);

/** A link to hand over: copy, or the system share sheet. */
export function LinkBox({ url, note }: { url: string; note: string }) {
  const { actions } = useApp();
  return (
    <div className="glass flex flex-col gap-3 p-4">
      <p className="text-15 text-[var(--tx2)]">{note}</p>
      <code className="block select-all break-all rounded-xl bg-shade/30 p-3 text-14">{url}</code>
      <div className="flex gap-2">
        <PrimaryButton
          className="flex-1"
          onClick={async () => actions.say((await copyText(url)) ? ad.copied : url)}
        >
          {ad.copy}
        </PrimaryButton>
        {canShareLink() && (
          <PrimaryButton tone="glass" className="px-5" onClick={() => void shareLink(url)}>
            {ad.share}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}

/** Loads with retry; `null` while loading, an Error after a failure. */
export function useLoad<T>(f: () => Promise<T>) {
  const [v, setV] = useState<T | null | Error>(null);
  const load = useCallback(() => {
    setV(null);
    f().then(setV, (e: unknown) => setV(e instanceof Error ? e : new Error(String(e))));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the loader is fixed per screen
  }, []);
  useEffect(load, [load]);
  return [v, load] as const;
}

/** The whole registry, page by page, without the merged-away players. */
export async function allPlayers(): Promise<Player[]> {
  const out: Player[] = [];
  let cursor: string | null = null;
  do {
    const page = await ep.players(undefined, cursor);
    out.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return out.filter((x) => !x.mergedInto);
}

/** A row's trailing chevron: the row opens something. */
export const Chevron = () => (
  <span aria-hidden className="shrink-0 text-20 leading-none text-[var(--tx2)]">
    ›
  </span>
);
