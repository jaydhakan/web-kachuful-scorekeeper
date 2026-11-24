import { useEffect, useRef, useState } from 'react';
import { Avatar, type Face } from '@/components/ui/Avatar';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Sheet } from '@/components/ui/Sheet';
import { HAPTIC, playCue } from '@/fx/feedback';
import { vibrate } from '@/hooks/useHaptics';
import { ApiError } from '@/sync/api';
import { ep } from '@/sync/endpoints';
import { seatEp, type CircleMember } from '@/sync/seatInviteApi';
import type { Balance, OwnedItem } from '@/sync/types';
import { wardrobe as w } from '@/strings/wardrobe';
import { itemOf, priceOf } from '@/wardrobe/catalog';
import { StageBustLazy } from '@/wardrobe/StageBustLazy';

export interface Buying {
  id: string;
  v: number;
  mode: 'buy' | 'gift';
}

const errText = (e: unknown) =>
  (e instanceof ApiError && w.bazaar.err[e.code]) || w.bazaar.errOther;

/** Confirm a purchase or a gift, then show the bust wearing it. The id is made once, so a retry never pays twice. */
export function BuySheet({
  me,
  buying,
  owned,
  onClose,
  onBought,
  onBalance,
}: {
  me: Face;
  buying: Buying;
  owned: readonly OwnedItem[];
  onClose: () => void;
  onBought?: (item: OwnedItem) => void;
  onBalance?: (b: Balance) => void;
}) {
  const item = itemOf(buying.id);
  const [v, setV] = useState(buying.v);
  const [to, setTo] = useState<CircleMember | null>(null);
  const [circle, setCircle] = useState<CircleMember[] | null>(null);
  const [state, setState] = useState<'ask' | 'busy' | 'done'>('ask');
  const [err, setErr] = useState<string | null>(null);
  const idRef = useRef<string>(crypto.randomUUID());
  useEffect(() => {
    if (buying.mode !== 'gift') return;
    seatEp
      .circle()
      .then((c) => setCircle(c.items))
      .catch(() => setCircle([]));
  }, [buying.mode]);
  if (!item) return null;
  const name = w.name(item.id);
  // A gift is priced on what the receiver owns, which only the server knows: show the full price.
  const price = priceOf(item, v, buying.mode === 'buy' && owned.some((o) => o.id === item.id)) ?? 0;

  const go = async () => {
    setState('busy');
    setErr(null);
    try {
      if (buying.mode === 'buy') {
        const r = await ep.buy(item.id, v, idRef.current);
        onBought?.(r.item);
        onBalance?.(r.balance);
      } else if (to) {
        await ep.sendGift(item.id, v, to.playerId, idRef.current);
      }
      setState('done');
      vibrate(HAPTIC.BEAT);
      playCue({ name: 'ghungroo' });
      playCue({ name: 'coin' });
    } catch (e) {
      setState('ask');
      setErr(errText(e));
      // A clear "no" from the server is final for this id; a network failure keeps it, so the retry is the same buy.
      if (e instanceof ApiError && e.code !== 'offline') idRef.current = crypto.randomUUID();
    }
  };

  const face: Face =
    buying.mode === 'gift' && to ? { ...to, id: to.playerId, playerId: to.playerId } : me;
  return (
    <Sheet title={buying.mode === 'buy' ? w.bazaar.buy : w.bazaar.gift} onClose={onClose}>
      <div className="flex flex-col items-center gap-3 pb-2">
        <StageBustLazy
          p={face}
          look={{ ...(face.look ?? {}), [item.slot]: { id: item.id, v } }}
          size={160}
        />
        {state === 'done' ? (
          <>
            <p role="status" className="text-18 font-bold">
              {buying.mode === 'buy' ? w.bazaar.bought(name) : w.bazaar.sent(name, to?.name ?? '')}
            </p>
            <PrimaryButton className="w-full" onClick={onClose}>
              {buying.mode === 'buy' ? w.bazaar.afterBuy : w.bazaar.done}
            </PrimaryButton>
          </>
        ) : (
          <>
            {item.variants > 1 && (
              <div
                role="group"
                aria-label={w.bazaar.pickColour}
                className="flex flex-wrap justify-center gap-2"
              >
                {Array.from({ length: item.variants }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={v === n}
                    aria-label={w.page.colour(n + 1)}
                    onClick={() => setV(n)}
                    className={`press grid h-11 w-11 place-items-center rounded-full ${v === n ? 'shadow-[inset_0_0_0_2px_var(--accent)]' : 'glass'}`}
                  >
                    <StageBustLazy
                      p={face}
                      look={{ [item.slot]: { id: item.id, v: n } }}
                      size={36}
                    />
                  </button>
                ))}
              </div>
            )}
            {buying.mode === 'gift' && (
              <div className="w-full">
                <p className="mb-2 text-14 font-bold">{w.bazaar.pickPerson}</p>
                {circle == null ? (
                  <p aria-busy="true" className="h-14" />
                ) : circle.length === 0 ? (
                  <p className="text-14 text-[var(--tx2)]">{w.bazaar.noCircle}</p>
                ) : (
                  <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                    {circle.map((c) => (
                      <li key={c.playerId}>
                        <button
                          type="button"
                          aria-pressed={to?.playerId === c.playerId}
                          onClick={() => setTo(c)}
                          className={`press flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-16 ${to?.playerId === c.playerId ? 'shadow-[inset_0_0_0_2px_var(--accent)]' : 'glass'}`}
                        >
                          <Avatar
                            p={{ ...c, playerId: c.playerId }}
                            className="relative grid h-9 w-9 place-items-center rounded-full text-18"
                          />
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <p className="text-center text-16">
              {buying.mode === 'buy'
                ? w.bazaar.confirmBuy(name, price)
                : to
                  ? w.bazaar.confirmGift(name, to.name, price)
                  : null}
            </p>
            {err && (
              <p role="alert" className="text-14 text-[var(--danger)]">
                {err}
              </p>
            )}
            <PrimaryButton
              className="w-full"
              busy={state === 'busy'}
              disabled={state === 'busy' || (buying.mode === 'gift' && !to)}
              onClick={() => void go()}
            >
              {buying.mode === 'buy' ? w.bazaar.buy : w.bazaar.gift}
            </PrimaryButton>
          </>
        )}
      </div>
    </Sheet>
  );
}
