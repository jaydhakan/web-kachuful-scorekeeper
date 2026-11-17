import { lazy, Suspense, useEffect, useState } from 'react';
import type { KtGame, KtHand } from '@/games/kaali-teeri/domain';
import { kp } from '@/games/kaali-teeri/strings/play';
import { useMoments } from '@/fx/moments';
import type { SeatPoint } from '@/fx/ui';
import { FLIP_S, FLY_S } from './reveal';

const SeatSpotlight = lazy(() => import('@/fx/ui').then((m) => ({ default: m.SeatSpotlight })));
// The tables a hand in play is drawn on: the phone's and the desk's.
const TABLES = ['kt-play', 'kt-ws'];

/** Where a seat's avatar is on screen, on whichever table is showing; null when none is. */
function seatAt(seat: number): SeatPoint | null {
  for (const t of TABLES) {
    const r = document
      .querySelector(`[data-table="${t}"] [data-seat="${seat}"] [data-seat-avatar]`)
      ?.getBoundingClientRect();
    if (r && r.width > 0 && r.bottom > 0 && r.top < innerHeight)
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
  }
  return null;
}

type Shown = {
  from: SeatPoint | null;
  to: SeatPoint;
  line: string;
  reduced: boolean;
  signal: AbortSignal;
  done: () => void;
};

/**
 * K1, the table's biggest reveal: when the hand's last called card is marked (just now, on this screen), the light
 * travels from the bidder to that partner once the reveal's dot has landed. Earlier cards keep the colour run only.
 * A Beat through the moment queue (the phone draws two copies of the cards; the queue plays it once).
 */
export function LastPartner({
  g,
  h,
  fresh,
}: {
  g: KtGame;
  h: KtHand;
  fresh: ReadonlyMap<number, number>;
}) {
  const q = useMoments();
  const [shown, setShown] = useState<Shown | null>(null);
  const last = [...fresh].sort((a, b) => b[1] - a[1])[0]?.[0];
  const partnerId = last === undefined ? null : h.playedBy[last];
  const complete = !h.playedBy.includes(null);
  useEffect(() => {
    if (last === undefined || !complete || !partnerId || partnerId === h.bidder) return;
    const seat = g.players.findIndex((p) => p.id === partnerId),
      bidderSeat = g.players.findIndex((p) => p.id === h.bidder);
    const id = `kt-last:${g.syncId}:${h.index}`;
    const t = setTimeout(
      () => {
        const to = seatAt(seat);
        if (!to) return;
        const show =
          (reduced: boolean) =>
          ({ signal }: { signal: AbortSignal }) =>
            new Promise<void>((done) =>
              setShown({
                from: seatAt(bidderSeat),
                to,
                line: kp.play.withLine(g.players[seat].name, g.players[bidderSeat].name),
                reduced,
                signal,
                done: () => (setShown(null), done()),
              }),
            );
        q.push({
          id,
          tier: 'beat',
          priority: 0,
          scope: id,
          sound: 'roll',
          play: show(false),
          reduced: show(true),
        });
      },
      (FLIP_S + FLY_S) * 1000,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per marking
  }, [last, fresh.get(last ?? -1)]);
  if (!shown) return null;
  return (
    <Suspense fallback={null}>
      <SeatSpotlight
        from={shown.from}
        to={shown.to}
        line={shown.line}
        tone="var(--kt-bid)"
        reduced={shown.reduced}
        signal={shown.signal}
        onDone={shown.done}
      />
    </Suspense>
  );
}
