import { AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { agoTxt } from '@/lib/format';
import { byCode } from '@/progression/catalogue';
import { peekProgression } from '@/progression/registry';
import { ep } from '@/sync/endpoints';
import type { SikkeEntry, SikkeLevel } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { useEveryCatalogue } from '@/components/progression/ActivityPage';
import { authError } from '@/platform/pages/AuthPages';
import { RemoteGate } from '@/components/RemoteGate';
import { Icon } from '@/components/ui/Icons';
import { ErrorState, Skeleton } from '@/components/ui/Page';
import { Sheet } from '@/components/ui/Sheet';
import { platform } from '@/strings/platform';
import { sikke as sk } from '@/strings/sikke';

/** How far through a level `lifetime` is, 0–1 (1 at the top). */
export const levelShare = (l: SikkeLevel, lifetime: number) =>
  l.next == null ? 1 : Math.min(1, Math.max(0, (lifetime - l.from) / (l.next - l.from)));

/** The level's bar: a scaled fill, so only `transform` changes. */
export function LevelBar({ share }: { share: number }) {
  return (
    <span aria-hidden className="block h-1.5 w-full overflow-hidden rounded-full bg-ov/10">
      <span
        className="block h-full w-full origin-left rounded-full bg-[var(--gold)] transition-transform duration-500 motion-reduce:transition-none"
        style={{ transform: `scaleX(${share})` }}
      />
    </span>
  );
}

/** A player's Sikke and level; a tap opens their ledger. Signed in only (the server keeps the ledger). */
export function WalletChip({ id, className = '' }: { id: string; className?: string }) {
  const r = useRemote(`sikke:${id}`, (o) => ep.sikke(id, o));
  const [open, setOpen] = useState(false);
  return (
    <>
      <RemoteGate r={r} rows={1}>
        {(w) => (
          <button
            type="button"
            aria-label={sk.walletSaid(w.balance, w.level.n)}
            onClick={() => setOpen(true)}
            className={`press glass flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left ${className}`}
          >
            <span aria-hidden className="text-28 leading-none">
              {sk.glyph}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="num text-18 font-bold">{w.balance.toLocaleString('en-IN')}</span>
                <span className="text-13 text-[var(--tx2)]">{sk.levelOf(w.level.n)}</span>
              </span>
              <LevelBar share={levelShare(w.level, w.lifetime)} />
              <span className="text-13 text-[var(--tx2)]">
                {w.level.next == null
                  ? sk.top
                  : sk.toNext(w.level.next - w.lifetime, w.level.n + 1)}
              </span>
            </span>
            <span aria-hidden className="text-[var(--tx2)]">
              {Icon.chev}
            </span>
          </button>
        )}
      </RemoteGate>
      <AnimatePresence>
        {open && (
          <Sheet key="ledger" title={sk.ledger} onClose={() => setOpen(false)} full roomy="panel">
            <Ledger id={id} lifetime={r.data?.lifetime ?? null} />
          </Sheet>
        )}
      </AnimatePresence>
    </>
  );
}

/** What a ledger line says: the achievement's emoji and name, or the kind; and which game. */
function useLine(e: SikkeEntry): { emoji: string; title: string; game: string | null } {
  const prog = e.game ? peekProgression(e.game) : undefined;
  const game = e.game ? platform.games[e.game].name : null;
  if (e.kind === 'achievement' && e.code && prog) {
    const name = prog.strings.achievements[e.code]?.name ?? e.code;
    return { emoji: byCode(prog).get(e.code)?.emoji ?? sk.glyph, title: name, game };
  }
  return { emoji: sk.glyph, title: sk.kind[e.kind], game };
}

function Line({ e }: { e: SikkeEntry }) {
  const l = useLine(e);
  return (
    <li className="flex min-h-14 items-center gap-3 border-t border-ov/10 px-1 py-2 first:border-t-0">
      <span aria-hidden className="w-8 shrink-0 text-center text-22">
        {l.emoji}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-15 font-bold [overflow-wrap:anywhere]">{l.title}</span>
        <span className="text-13 text-[var(--tx2)]">
          {[l.game, agoTxt(e.earnedAt)].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="num shrink-0 text-15 font-bold text-[var(--gold-tx)]">
        {sk.plus(e.amount)}
      </span>
    </li>
  );
}

/** Every entry, newest first, a page at a time. */
export function Ledger({ id, lifetime }: { id: string; lifetime: number | null }) {
  const ready = useEveryCatalogue(true);
  const [items, setItems] = useState<SikkeEntry[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const page = useCallback(
    async (from: string | null) => {
      setBusy(true);
      setErr(null);
      try {
        const p = await ep.sikkeEntries(id, from);
        setItems((xs) => (from ? [...(xs ?? []), ...p.items] : p.items));
        setCursor(p.nextCursor);
      } catch (x) {
        setErr(x);
      } finally {
        setBusy(false);
      }
    },
    [id],
  );
  useEffect(() => {
    void page(null);
  }, [page]);

  if (items == null || !ready)
    return err ? (
      <ErrorState msg={authError(err)} onRetry={() => void page(null)} />
    ) : (
      <Skeleton rows={5} />
    );
  if (!items.length)
    return <p className="py-6 text-center text-15 text-[var(--tx2)]">{sk.empty}</p>;
  return (
    <div className="pb-4">
      {lifetime != null && (
        <p className="mb-2 text-14 text-[var(--tx2)]">{sk.lifetime(lifetime)}</p>
      )}
      <ul>
        {items.map((e) => (
          <Line key={e.id} e={e} />
        ))}
      </ul>
      {err != null && <ErrorState msg={authError(err)} onRetry={() => void page(cursor)} />}
      {cursor && err == null && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void page(cursor)}
          className="press glass mt-3 min-h-11 w-full text-15 font-bold disabled:opacity-60"
        >
          {sk.more}
        </button>
      )}
    </div>
  );
}
