import { useState } from 'react';
import { cardsEach, deckTotal, type KtGame, type KtHand } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { ktBidding } from '@/games/kaali-teeri/strings/bidding';
import { BidStepper } from '@/components/ui/BidKeypad';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { seatBadges } from '../parts/bits';
import { BidTable, TableMiddle } from './BidTable';
import { HandFrame } from '../parts/HandFrame';
import { ModeSwitch } from './ModeSwitch';

/** The quick changes for a step of 5 are −5 / +5 / +10 / +25; a step of 10 doubles them. */
export const quickSteps = (step: number) => [-step, step, 2 * step, 5 * step];

/** Quick mode: the auction happened out loud; tap the winner's seat, set the amount, confirm. */
export function QuickBid({ g, h }: { g: KtGame; h: KtHand }) {
  const { actions } = useKt();
  const s = ktBidding;
  const { minBid, step, decks } = g.rules;
  const max = deckTotal(decks);
  const [seat, setSeat] = useState<number | null>(null);
  const [amount, setAmount] = useState(minBid);
  const p = seat == null ? null : g.players[seat];
  return (
    <HandFrame
      fit
      g={g}
      h={h}
      step={s.frame.bidding}
      sub={s.frame.dealt(g.players[h.dealerIndex].name, cardsEach(g.players.length))}
      bar={
        <div className="flex w-full flex-col gap-2">
          <p className="text-center text-13 leading-4 text-[var(--tx2)] @h-short:hidden">
            {s.quick.range(minBid, step, max)}
          </p>
          <BidStepper
            label={s.quick.amount}
            value={amount}
            onChange={setAmount}
            min={minBid}
            max={max}
            step={step}
            quick={quickSteps(step)}
            confirmLabel={p ? s.quick.confirm(p.name, amount) : undefined}
            onConfirm={p ? (v) => actions.quickBid(p.id, v) : undefined}
          />
          {!p && (
            <PrimaryButton className="w-full" disabled>
              {s.quick.tapSeat}
            </PrimaryButton>
          )}
        </div>
      }
    >
      <ModeSwitch />
      <h2 className="mono-label mb-1 px-1 text-12 text-[var(--accent-tx)] @h-short:sr-only">
        {s.quick.who}
      </h2>
      <BidTable
        uid="ktquick"
        g={g}
        h={h}
        cur={seat ?? undefined}
        badges={p ? seatBadges({ bidder: p.id, playedBy: [] }) : undefined}
        onSeat={(k) => {
          setSeat(k);
          actions.vib();
        }}
        center={(flat) => (
          <TableMiddle
            flat={flat}
            word
            kicker={s.quick.winningBid}
            amount={p ? p.name : s.quick.nobody}
            who={p ? s.quick.wonIt : s.quick.tapWinner}
          />
        )}
      />
      <p role="status" aria-live="polite" className="sr-only">
        {p ? s.quick.picked(p.name) : ''}
      </p>
    </HandFrame>
  );
}
