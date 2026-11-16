import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { AvatarFill } from '@/components/ui/Avatar';
import { Sheet } from '@/components/ui/Sheet';
import { agoTxt } from '@/lib/format';
import { nameKey } from '@/people';
import { seatInvites as str } from '@/strings/seatInvites';
import { seatColor } from '@/theme/palette';
import { ONLINE_MS, seatEp, type CircleMember } from '@/sync/seatInviteApi';
import { serverNow } from '@/sync/seatInvites';

const s = str.sheet;

export interface TableInviteSheetProps {
  /** Someone tapped: send the invite. A promise keeps their row busy; a rejection shows "Couldn't send". */
  onPick: (user: CircleMember) => void | Promise<unknown>;
  onClose: () => void;
  /** Account ids not to offer (already seated or invited). */
  exclude?: readonly string[];
  title?: string;
  /** One line under the title ("They will be your partner."); the invite note follows it. */
  subtitle?: string;
  /** A row above the circle (Spades' "Move here"). */
  lead?: ReactNode;
}

/** Online now first, then the rest of the circle by who was played with last. */
export function splitCircle(items: readonly CircleMember[], now: number) {
  const on = (m: CircleMember) => m.lastSeenAt !== null && now - m.lastSeenAt < ONLINE_MS;
  const recent = (a: CircleMember, b: CircleMember) =>
    (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0) || a.name.localeCompare(b.name);
  return {
    online: items.filter(on).sort(recent),
    rest: items.filter((m) => !on(m)).sort(recent),
  };
}

function Row({
  m,
  online,
  busy,
  locked,
  first,
  onPick,
}: {
  m: CircleMember;
  online: boolean;
  busy: boolean;
  locked: boolean;
  /** Focus starts here rather than in the search field, so a phone's keyboard stays down. */
  first: boolean;
  onPick: () => void;
}) {
  const sub = m.lastPlayedAt ? s.played(agoTxt(m.lastPlayedAt, serverNow())) : s.neverPlayed;
  return (
    <li>
      <button
        type="button"
        onClick={locked ? undefined : onPick}
        {...(first ? { 'data-autofocus': '' } : {})}
        aria-disabled={locked || undefined}
        aria-busy={busy || undefined}
        aria-label={`${s.invite} ${m.name}${online ? `, ${s.onlineAria}` : ''}, ${sub}`}
        className="press flex min-h-14 w-full items-center gap-3 rounded-[14px] p-1.5 text-left aria-disabled:opacity-60"
      >
        <span
          aria-hidden
          className="relative grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full text-22"
          style={{ background: seatColor(m.color) }}
        >
          <AvatarFill p={m} />
          {online && (
            <i className="absolute -bottom-px -right-px h-3 w-3 rounded-full bg-[var(--success)] shadow-[0_0_0_2.5px_var(--sheet-bg)]" />
          )}
        </span>
        <span aria-hidden className="min-w-0 flex-1">
          <b className="block [overflow-wrap:anywhere] text-16">{m.name}</b>
          <small className="block [overflow-wrap:anywhere] text-13 text-[var(--tx2)]">{sub}</small>
        </span>
        <span aria-hidden className="shrink-0 px-1 text-15 font-bold text-[var(--accent-tx)]">
          {busy ? s.inviting : s.invite}
        </span>
      </button>
    </li>
  );
}

/**
 * The host's invite picker: search, "Online now" (seen in the last minute), then the rest of the circle, newest
 * game first. One tap invites. Loading, empty, no-results and error each say so.
 */
export function TableInviteSheet({
  onPick,
  onClose,
  exclude = [],
  title = s.title,
  subtitle,
  lead,
}: TableInviteSheetProps) {
  const [items, setItems] = useState<CircleMember[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [sendFailed, setSendFailed] = useState(false);
  const searchId = useId();

  const load = useCallback(() => {
    setFailed(false);
    let live = true;
    seatEp
      .circle()
      .then((r) => live && setItems(r.items))
      .catch(() => live && setFailed(true));
    return () => void (live = false);
  }, []);
  useEffect(load, [load]);

  const { online, rest } = useMemo(() => {
    const skip = new Set(exclude);
    const key = nameKey(q);
    const list = (items ?? []).filter(
      (m) => !skip.has(m.userId) && (!key || nameKey(m.name).includes(key)),
    );
    return splitCircle(list, serverNow());
  }, [items, exclude, q]);

  const pick = async (m: CircleMember) => {
    setSendFailed(false);
    setBusy(m.userId);
    try {
      await onPick(m);
    } catch {
      setSendFailed(true);
    }
    setBusy(null);
  };

  const anyone = (items ?? []).some((m) => !exclude.includes(m.userId));
  let body;
  if (failed && !items)
    body = (
      <div role="alert" className="flex items-center gap-3 py-4">
        <p className="flex-1 text-15 text-[var(--tx2)]">{s.loadFailed}</p>
        <button
          type="button"
          onClick={load}
          className="press min-h-11 rounded-xl px-3 text-15 font-bold text-[var(--accent-tx)]"
        >
          {s.retry}
        </button>
      </div>
    );
  else if (!items)
    body = (
      <p role="status" className="py-4 text-15 text-[var(--tx2)]">
        {s.loading}
      </p>
    );
  else if (!anyone) body = <p className="px-1 py-4 text-15 text-[var(--tx2)]">{s.empty}</p>;
  else if (!online.length && !rest.length)
    body = (
      <p role="status" className="px-1 py-4 text-15 text-[var(--tx2)]">
        {s.noResults(q.trim())}
      </p>
    );
  else {
    const lead = (online[0] ?? rest[0]).userId;
    const group = (label: string, list: CircleMember[], on: boolean) =>
      list.length > 0 && (
        <section aria-label={label}>
          <h3 className="mono-label mx-1 mb-1 mt-3 text-13 text-[var(--tx2)]">{label}</h3>
          <ul>
            {list.map((m) => (
              <Row
                key={m.userId}
                m={m}
                online={on}
                busy={busy === m.userId}
                locked={!!busy}
                first={m.userId === lead}
                onPick={() => void pick(m)}
              />
            ))}
          </ul>
        </section>
      );
    body = (
      <>
        {group(s.online, online, true)}
        {group(s.circle, rest, false)}
      </>
    );
  }

  return (
    <Sheet title={title} onClose={onClose}>
      <p className="mb-3 text-15 text-[var(--tx2)]">
        {subtitle ? `${subtitle} ` : ''}
        {s.subtitle}
      </p>
      {lead}
      {anyone && (
        <>
          <label htmlFor={searchId} className="sr-only">
            {s.search}
          </label>
          <input
            id={searchId}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={s.search}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="mat-inp min-h-12 w-full rounded-[14px] px-3.5 text-16 outline-none placeholder:text-[var(--ph)]"
          />
        </>
      )}
      {sendFailed && (
        <p role="alert" className="mt-2 text-14 font-medium text-[var(--warn)]">
          {s.sendFailed}
        </p>
      )}
      {body}
    </Sheet>
  );
}
