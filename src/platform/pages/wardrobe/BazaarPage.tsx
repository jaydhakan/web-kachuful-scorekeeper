import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { Face } from '@/components/ui/Avatar';
import { Page, Section } from '@/components/ui/Page';
import { EmptyState } from '@/components/ui/PageParts';
import { RemoteGate } from '@/components/RemoteGate';
import { useApp } from '@/games/kachuful/state/store';
import { agoTxt } from '@/lib/format';
import { ep } from '@/sync/endpoints';
import { useSession } from '@/sync/session';
import type { Balance, BazaarItem, BazaarResp, OwnedItem } from '@/sync/types';
import { useRemote } from '@/sync/useRemote';
import { wardrobe as w } from '@/strings/wardrobe';
import { itemOf, LEVEL_GIFTS } from '@/wardrobe/catalog';
import { StageBustLazy } from '@/wardrobe/StageBustLazy';
import { BuySheet, type Buying } from './BuySheet';
import { useMe } from './WardrobePage';

const DAY = 86_400_000;

/** The weekly Bazaar (REWARDS-PLAN §10): this week's stock, the always shelf and the level gifts. */
export function BazaarPage() {
  const s = useSession();
  const me = useMe();
  const r = useRemote('bazaar', (o) => ep.bazaar(o));
  if (!s)
    return (
      <Page title={w.bazaar.title}>
        <p className="text-16">{w.page.signedOut}</p>
      </Page>
    );
  if (!me)
    return (
      <Page title={w.bazaar.title}>
        <p className="text-16">{w.page.noPlayer}</p>
      </Page>
    );
  return (
    <Page title={w.bazaar.title}>
      <RemoteGate r={r} rows={6}>
        {(d) => <Stalls me={me} d={d} offline={r.offline} />}
      </RemoteGate>
      <Gifts />
    </Page>
  );
}

function Stalls({ me, d, offline }: { me: Face; d: BazaarResp; offline: boolean }) {
  const { actions } = useApp();
  const [balance, setBalance] = useState<Balance>(d.balance);
  const [bought, setBought] = useState<OwnedItem[]>([]);
  const [buying, setBuying] = useState<Buying | null>(null);
  const has = (b: BazaarItem, v: number) =>
    b.owned.includes(v) || bought.some((o) => o.id === b.id && o.v === v);
  const days = Math.ceil((d.refreshesAt - Date.now()) / DAY);
  const card = (b: BazaarItem) => {
    const it = itemOf(b.id);
    if (!it) return null;
    const all = Array.from({ length: it.variants }, (_, n) => n).every((n) => has(b, n));
    const tryOn = () =>
      actions.open({ screen: 'wardrobe', params: { slot: it.slot, id: it.id, v: '0' } });
    return (
      <li key={b.id} className="glass flex flex-col items-center gap-1 rounded-2xl p-2">
        {it.slot === 'title' ? (
          <span className="grid h-24 place-items-center text-center text-16 font-bold">
            {w.name(it.id)}
          </span>
        ) : (
          <StageBustLazy p={me} look={{ [it.slot]: { id: it.id, v: 0 } }} size={96} />
        )}
        <span className="w-full truncate text-center text-14 font-bold">{w.name(it.id)}</span>
        <span className="text-12 text-[var(--tx2)]">
          {w.rarity[it.rarity]} ·{' '}
          {all ? w.bazaar.ownedAll : `${b.price.toLocaleString('en-IN')} 🪙`}
        </span>
        <div className="flex w-full gap-1">
          <button
            type="button"
            onClick={tryOn}
            className="press min-h-11 flex-1 rounded-full text-13"
          >
            {w.bazaar.tryOn}
          </button>
          {!all && (
            <button
              type="button"
              disabled={offline}
              onClick={() => setBuying({ id: b.id, v: has(b, 0) ? 1 : 0, mode: 'buy' })}
              className="press min-h-11 flex-1 rounded-full bg-[var(--accent)] text-13 font-bold text-ink-on-accent disabled:opacity-50"
            >
              {w.bazaar.buy}
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={offline}
          onClick={() => setBuying({ id: b.id, v: 0, mode: 'gift' })}
          className="press min-h-11 w-full rounded-full text-13 text-[var(--accent-tx)] disabled:opacity-50"
        >
          🎁 {w.bazaar.gift}
        </button>
      </li>
    );
  };
  const grid = 'grid grid-cols-2 gap-2 sm:grid-cols-3';
  return (
    <>
      <p className="mb-4 text-18 font-bold" aria-live="polite">
        {w.bazaar.balance(balance.balance)}
      </p>
      <Section
        title={w.bazaar.weekly}
        aside={<span className="text-13 text-[var(--tx2)]">{w.bazaar.weeklyNote(days)}</span>}
      >
        <ul className={`${grid} mb-6`}>{d.weekly.map(card)}</ul>
      </Section>
      <Section
        title={w.bazaar.always}
        aside={<span className="text-13 text-[var(--tx2)]">{w.bazaar.alwaysNote}</span>}
      >
        <ul className={`${grid} mb-6`}>{d.always.map(card)}</ul>
      </Section>
      <Section title={w.bazaar.levels}>
        <ul className="mb-6 flex flex-col gap-1">
          {Object.entries(LEVEL_GIFTS).map(([lvl, g]) => (
            <li
              key={lvl}
              className="glass flex min-h-12 items-center gap-3 rounded-xl px-3 text-14"
            >
              <StageBustLazy
                p={me}
                look={itemOf(g.id) ? { [itemOf(g.id)!.slot]: g } : {}}
                size={40}
              />
              <span className="flex-1">{w.name(g.id)}</span>
              <span className="text-[var(--tx2)]">{w.page.lockedLevel(Number(lvl))}</span>
            </li>
          ))}
        </ul>
      </Section>
      <AnimatePresence>
        {buying && (
          <BuySheet
            key="buy"
            me={me}
            buying={buying}
            owned={bought}
            onClose={() => setBuying(null)}
            onBought={(o) => setBought((x) => [...x, o])}
            onBalance={setBalance}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Gifts() {
  const r = useRemote('gifts:mine', () => ep.myGifts(null));
  const s = useSession();
  return (
    <Section title={w.bazaar.gifts}>
      <RemoteGate r={r} rows={2}>
        {(p) =>
          p.items.length === 0 ? (
            <EmptyState icon="gift" title={w.bazaar.giftsEmpty} />
          ) : (
            <ul className="flex flex-col gap-1">
              {p.items.map((g) => {
                const mine = g.to.id === s?.player?.id;
                return (
                  <li
                    key={g.id}
                    className="glass flex min-h-12 items-center gap-2 rounded-xl px-3 text-14"
                  >
                    <span className="flex-1">
                      {mine
                        ? w.bazaar.giftFrom(w.name(g.item.id), g.from.displayName)
                        : w.bazaar.giftTo(w.name(g.item.id), g.to.displayName)}
                    </span>
                    <span className="text-12 text-[var(--tx2)]">
                      {g.openedAt == null ? w.bazaar.unopened : agoTxt(g.sentAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )
        }
      </RemoteGate>
    </Section>
  );
}

export default BazaarPage;
