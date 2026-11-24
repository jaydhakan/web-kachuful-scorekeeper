import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Avatar, type Face } from '@/components/ui/Avatar';
import { Page, Section } from '@/components/ui/Page';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { RemoteGate } from '@/components/RemoteGate';
import { useApp } from '@/games/kachuful/state/store';
import { useArchive } from '@/state/useArchive';
import { ep } from '@/sync/endpoints';
import { useSession } from '@/sync/session';
import type { OwnedItem, SavedLook, WardrobeResp } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { wardrobe as w } from '@/strings/wardrobe';
import { completeSets, itemOf } from '@/wardrobe/catalog';
import { StageBustLazy } from '@/wardrobe/StageBustLazy';
import { SLOTS, type Look, type LookItem, type Slot } from '@/wardrobe/types';
import { BuySheet, type Buying } from './BuySheet';
import { itemsIn, keepOwned, lockReason, notOwned, ownedKeys, shuffleLook } from './logic';

/** The signed-in player as a face, from the registry when it has them (photo, look), else the session. */
export function useMe(): Face | null {
  const s = useSession();
  const rec = useArchive((a) => (s?.player ? a.get('players', s.player.id) : undefined));
  if (!s?.player) return null;
  return rec ?? { ...s.player, playerId: s.player.id };
}

const same = (a: Look, b: Look) => JSON.stringify(a) === JSON.stringify(b);

/** The dressing room (REWARDS-PLAN §4.5): a big bust, the table's view of it, and a shelf per slot. `tryOn` arrives from the Bazaar. */
export function WardrobePage({ tryOn }: { tryOn?: LookItem & { slot: Slot } }) {
  const s = useSession();
  const me = useMe();
  const { actions } = useApp();
  const r = useRemote('wardrobe', (o) => ep.wardrobe(o));
  if (!s)
    return (
      <Page title={w.title}>
        <p className="text-16">{w.page.signedOut}</p>
      </Page>
    );
  if (r.error?.code === 'no_player' || !me)
    return (
      <Page title={w.title}>
        <p className="text-16">{w.page.noPlayer}</p>
      </Page>
    );
  return (
    <Page
      title={w.title}
      actions={
        <button
          type="button"
          onClick={() => actions.open({ screen: 'bazaar' })}
          className="press min-h-11 rounded-full px-4 text-14 font-bold text-[var(--accent-tx)]"
        >
          {w.page.toBazaar}
        </button>
      }
    >
      <RemoteGate r={r} rows={4}>
        {(d) => <Room me={me} d={d} offline={r.offline} onSaved={r.reload} tryOn={tryOn} />}
      </RemoteGate>
    </Page>
  );
}

function Room({
  me,
  d,
  offline,
  onSaved,
  tryOn,
}: {
  me: Face;
  d: WardrobeResp;
  offline: boolean;
  onSaved: () => void;
  tryOn?: LookItem & { slot: Slot };
}) {
  const [worn, setWorn] = useState<Look>(d.look);
  const [draft, setDraft] = useState<Look>(() =>
    tryOn ? { ...d.look, [tryOn.slot]: { id: tryOn.id, v: tryOn.v } } : d.look,
  );
  const [slot, setSlot] = useState<Slot>(tryOn?.slot ?? 'outfit');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [saved, setSaved] = useState(d.saved);
  const [buying, setBuying] = useState<Buying | null>(null);
  const [owned, setOwned] = useState<OwnedItem[]>(d.owned);
  useEffect(() => setOwned(d.owned), [d.owned]);
  const keys = useMemo(() => ownedKeys(owned), [owned]);
  const missing = notOwned(draft, keys);
  const sets = completeSets(draft);
  const dirty = !same(draft, worn);

  const save = async () => {
    const before = worn;
    setWorn(draft); // optimistic: the table sees it as soon as the server agrees; rolled back if it doesn't
    setStatus('saving');
    try {
      setWorn(await ep.putLook(draft));
      setStatus('saved');
      onSaved();
    } catch {
      setWorn(before);
      setStatus('failed');
    }
  };
  const put = (it: LookItem | undefined) => {
    setStatus('idle');
    setDraft((l) => {
      const n = { ...l };
      if (it) n[slot] = it;
      else delete n[slot];
      return n;
    });
  };

  return (
    <>
      <p className="mb-4 text-14 text-[var(--tx2)]">{w.page.intro}</p>
      <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl bg-[var(--felt)] p-4 shadow-[inset_0_0_0_2px_var(--felt-rim)]">
        <StageBustLazy
          p={me}
          look={draft}
          size="min(220px, 60vw)"
          label={w.wearing(
            'You',
            SLOTS.flatMap((s) => (draft[s] ? [w.name(draft[s].id)] : [])),
          )}
        />
        <div className="flex items-end gap-6 text-13 text-[var(--tx2)]">
          <span className="flex flex-col items-center gap-1">
            <Avatar
              p={{ ...me, look: draft }}
              className="relative grid h-8 w-8 place-items-center rounded-full text-18"
            />
            {w.page.seat}
          </span>
          <span className="flex flex-col items-center gap-1">
            <Avatar
              p={{ ...me, look: draft }}
              className="relative grid h-[52px] w-[52px] place-items-center rounded-full text-28"
            />
            {w.page.hero}
          </span>
        </div>
        {sets.map((s) => (
          <p key={s} className="text-14 font-bold text-[var(--gold-tx)]">
            {w.page.setComplete(w.set[s])}
          </p>
        ))}
        {missing.length > 0 && (
          <p className="text-13 text-[var(--tx2)]">
            {w.page.notYours}: {missing.map((s) => w.name(draft[s]!.id)).join(', ')}
          </p>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <PrimaryButton
          className="flex-1"
          disabled={offline || !dirty || missing.length > 0 || status === 'saving'}
          busy={status === 'saving'}
          onClick={() => void save()}
        >
          {status === 'saving' ? w.page.saving : w.page.save}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => setDraft(shuffleLook(owned))}
          className="press glass min-h-11 rounded-full px-4 text-14 font-bold"
        >
          {w.page.shuffle}
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => setDraft(worn)}
            className="press min-h-11 rounded-full px-4 text-14 text-[var(--tx2)]"
          >
            {w.page.reset}
          </button>
        )}
      </div>
      <p role="status" className="mb-4 min-h-5 text-13 text-[var(--tx2)]">
        {offline
          ? w.page.offline
          : status === 'saved'
            ? w.page.saved
            : status === 'failed'
              ? w.page.saveFailed
              : ''}
      </p>

      <div role="tablist" aria-label={w.title} className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {SLOTS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={s === slot}
            onClick={() => setSlot(s)}
            className={`press flex min-h-11 shrink-0 flex-col items-center rounded-full px-4 py-1 text-14 font-bold ${s === slot ? 'bg-[var(--accent)] text-ink-on-accent' : 'glass'}`}
          >
            {w.slot[s]}
            <span className="text-11 font-normal opacity-80">{w.slotPlain[s]}</span>
          </button>
        ))}
      </div>
      <Shelf
        me={me}
        slot={slot}
        draft={draft}
        owned={owned}
        keys={keys}
        onPick={put}
        onBuy={(it) => setBuying({ id: it.id, v: it.v, mode: 'buy' })}
      />

      <SavedLooks
        saved={saved}
        offline={offline}
        onWear={(l) => setDraft(keepOwned(l, keys))}
        onSave={async (n, name) => {
          const sl = await ep.putSavedLook(n, name, draft);
          setSaved((x) => x.map((y, i) => (i === n ? sl : y)));
        }}
        onRemove={async (n) => {
          await ep.deleteSavedLook(n);
          setSaved((x) => x.map((y, i) => (i === n ? null : y)));
        }}
      />
      <AnimatePresence>
        {buying && (
          <BuySheet
            key="buy"
            me={me}
            buying={buying}
            owned={owned}
            onClose={() => setBuying(null)}
            onBought={(item) => setOwned((o) => [...o, item])}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Shelf({
  me,
  slot,
  draft,
  owned,
  keys,
  onPick,
  onBuy,
}: {
  me: Face;
  slot: Slot;
  draft: Look;
  owned: OwnedItem[];
  keys: Set<string>;
  onPick: (it: LookItem | undefined) => void;
  onBuy: (it: LookItem) => void;
}) {
  const cur = draft[slot];
  const item = cur && itemOf(cur.id);
  return (
    <Section title={`${w.slot[slot]} · ${w.slotPlain[slot]}`}>
      <ul className="mb-3 flex gap-2 overflow-x-auto pb-2">
        <li>
          <button
            type="button"
            aria-pressed={!cur}
            onClick={() => onPick(undefined)}
            className={`press grid h-[92px] w-[76px] place-items-center rounded-2xl text-13 ${!cur ? 'shadow-[inset_0_0_0_2px_var(--accent)]' : 'glass'}`}
          >
            {w.page.none}
          </button>
        </li>
        {itemsIn(slot).map((it) => {
          const mine = owned.filter((o) => o.id === it.id);
          const v = cur?.id === it.id ? cur.v : (mine[0]?.v ?? 0);
          const has = keys.has(`${it.id}:${v}`);
          const lock = has ? null : lockReason(it.id, v, owned);
          return (
            <li key={it.id}>
              <button
                type="button"
                aria-pressed={cur?.id === it.id}
                aria-label={`${w.name(it.id)}, ${w.rarity[it.rarity]}${has ? '' : `, ${w.page.notYours}`}`}
                onClick={() => onPick({ id: it.id, v })}
                className={`press flex h-[92px] w-[76px] flex-col items-center justify-end gap-0.5 rounded-2xl p-1 text-11 ${cur?.id === it.id ? 'shadow-[inset_0_0_0_2px_var(--accent)]' : 'glass'} ${has ? '' : 'opacity-60'}`}
              >
                {slot === 'title' ? (
                  <span className="grid flex-1 place-items-center text-center text-13 font-bold">
                    {w.name(it.id)}
                  </span>
                ) : (
                  <StageBustLazy p={me} look={{ [slot]: { id: it.id, v } }} size={56} />
                )}
                <span className="w-full truncate text-center">{w.name(it.id)}</span>
                {lock && (
                  <span className="w-full truncate text-center text-[var(--tx2)]">
                    {lock.kind === 'price'
                      ? `${lock.price} 🪙`
                      : lock.kind === 'level'
                        ? `L${lock.level}`
                        : '🏅'}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {cur && item && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {item.variants > 1 &&
            Array.from({ length: item.variants }, (_, n) => (
              <button
                key={n}
                type="button"
                aria-pressed={cur.v === n}
                aria-label={w.page.colour(n + 1)}
                onClick={() => onPick({ ...cur, v: n })}
                className={`press grid h-11 w-11 place-items-center rounded-full ${cur.v === n ? 'shadow-[inset_0_0_0_2px_var(--accent)]' : 'glass'} ${keys.has(`${cur.id}:${n}`) ? '' : 'opacity-60'}`}
              >
                <StageBustLazy p={me} look={{ [slot]: { id: cur.id, v: n } }} size={36} />
              </button>
            ))}
          {cur.id === 'jersey' && (
            <label className="flex items-center gap-2 text-14">
              {w.page.number}
              <input
                type="number"
                min={0}
                max={99}
                value={cur.number ?? 7}
                onChange={(e) =>
                  onPick({ ...cur, number: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })
                }
                className="glass h-11 w-20 rounded-xl px-3 text-16"
              />
            </label>
          )}
          {!keys.has(`${cur.id}:${cur.v}`) &&
            (() => {
              const lock = lockReason(cur.id, cur.v, owned);
              return lock.kind === 'price' ? (
                <PrimaryButton className="ml-auto" onClick={() => onBuy(cur)}>
                  {w.page.lockedPrice(lock.price)}
                </PrimaryButton>
              ) : (
                <span className="ml-auto text-13 text-[var(--tx2)]">
                  {lock.kind === 'level' ? w.page.lockedLevel(lock.level) : w.page.lockedHonour}
                </span>
              );
            })()}
        </div>
      )}
    </Section>
  );
}

function SavedLooks({
  saved,
  offline,
  onWear,
  onSave,
  onRemove,
}: {
  saved: (SavedLook | null)[];
  offline: boolean;
  onWear: (l: Look) => void;
  onSave: (slot: number, name: string) => Promise<void>;
  onRemove: (slot: number) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const run = async (n: number, f: () => Promise<void>) => {
    setBusy(n);
    try {
      await f();
    } finally {
      setBusy(null);
    }
  };
  return (
    <Section title={w.page.savedLooks}>
      <label className="mb-3 flex flex-col gap-1 text-14">
        {w.page.lookName}
        <input
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          className="glass h-11 rounded-xl px-3 text-16"
        />
      </label>
      <ul className="flex flex-col gap-2">
        {[0, 1, 2].map((n) => {
          const sl = saved[n] ?? null;
          return (
            <li key={n} className="glass flex min-h-14 items-center gap-2 rounded-2xl px-3">
              <span className="flex-1 truncate text-16 font-bold">
                {sl ? (
                  sl.name
                ) : (
                  <span className="font-normal text-[var(--tx2)]">{w.page.savedEmpty(n + 1)}</span>
                )}
              </span>
              {sl && (
                <button
                  type="button"
                  onClick={() => onWear(sl.look)}
                  className="press min-h-11 px-3 text-14 font-bold text-[var(--accent-tx)]"
                >
                  {w.page.wear}
                </button>
              )}
              <button
                type="button"
                disabled={offline || busy === n || !name.trim()}
                onClick={() => void run(n, () => onSave(n, name.trim()))}
                className="press min-h-11 px-3 text-14 disabled:opacity-50"
              >
                {w.page.saveHere}
              </button>
              {sl && (
                <button
                  type="button"
                  disabled={offline || busy === n}
                  onClick={() => void run(n, () => onRemove(n))}
                  className="press min-h-11 px-3 text-14 text-[var(--tx2)] disabled:opacity-50"
                >
                  {w.page.remove}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export default WardrobePage;
