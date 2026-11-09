import { useState } from 'react';
import { cardsEach, type KtGame, type KtHand } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { ktBidding } from '@/games/kaali-teeri/strings/bidding';
import { Avatar } from '@/components/ui/Avatar';
import { BidStepper } from '@/components/ui/BidKeypad';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ROLE_ICON, TEAM_FILL } from '../parts/bits';
import { BidTable, TableMiddle } from './BidTable';
import { HandFrame } from '../parts/HandFrame';
import { ModeSwitch } from './ModeSwitch';
import { quickSteps } from './QuickBid';
import { auctionView, callText } from './auctionView';

/** The full auction, turn by turn: each seat's last call on the table, the high bid in the middle, the pad below. */
export function Auction({ g, h }: { g: KtGame; h: KtHand }) {
  const { actions } = useKt();
  const s = ktBidding;
  const { st, min, max, order, idx, nameOf, bids, passed, speaker, canPass, shown } = auctionView(
    g,
    h,
  );

  // The amount starts at the lowest legal bid after every call (and after an undo).
  const [amount, setAmount] = useState(min ?? g.rules.minBid);
  const [seen, setSeen] = useState(h.calls.length);
  if (seen !== h.calls.length) {
    setSeen(h.calls.length);
    setAmount(min ?? g.rules.minBid);
  }

  return (
    <HandFrame
      fit
      g={g}
      h={h}
      step={s.frame.bidding}
      sub={s.frame.dealt(g.players[h.dealerIndex].name, cardsEach(g.players.length))}
      barNote={st.forcedTo ? s.auction.forcedNote(nameOf(st.forcedTo), g.rules.minBid) : ''}
      bar={
        speaker && (
          <div className="flex w-full flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <Avatar
                p={speaker}
                className="mat-av grid h-11 w-11 shrink-0 place-items-center rounded-full text-24"
              />
              <p className="min-w-0 flex-1 leading-tight">
                <span className="disp block text-22 font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere]">
                  {speaker.name}
                </span>
                <span className="text-14 text-[var(--tx2)]">
                  {st.forcedTo
                    ? s.auction.mustTake
                    : `${s.auction.toBid} · ${min != null ? s.auction.atLeast(min) : s.auction.onlyPass}`}
                </span>
              </p>
            </div>
            {st.forcedTo ? (
              <PrimaryButton className="w-full" onClick={() => actions.call('forced')}>
                {s.auction.takeIt(g.rules.minBid)}
              </PrimaryButton>
            ) : (
              <>
                {min != null && (
                  <BidStepper
                    label={s.auction.amount(speaker.name)}
                    value={amount}
                    onChange={setAmount}
                    min={min}
                    max={max}
                    step={g.rules.step}
                    quick={quickSteps(g.rules.step)}
                  />
                )}
                <div className={min != null ? 'grid grid-cols-2 gap-2.5' : 'flex'}>
                  <PrimaryButton
                    tone="glass"
                    className="w-full"
                    disabled={!canPass}
                    onClick={() => actions.call('pass')}
                  >
                    {s.auction.pass}
                  </PrimaryButton>
                  {min != null && (
                    <PrimaryButton className="w-full" onClick={() => actions.call(amount)}>
                      {s.auction.bid(amount)}
                    </PrimaryButton>
                  )}
                </div>
              </>
            )}
          </div>
        )
      }
    >
      <ModeSwitch />
      <BidTable
        uid="ktauction"
        g={g}
        h={h}
        cur={speaker ? idx(speaker.id) : undefined}
        bids={bids}
        badges={
          st.holder
            ? { [st.holder]: { icon: ROLE_ICON.bidder, label: s.table.high, style: TEAM_FILL } }
            : undefined
        }
        passed={passed}
        center={(flat) => (
          <TableMiddle
            flat={flat}
            kicker={st.high != null ? s.auction.highBid : s.auction.minBid}
            amount={st.high ?? g.rules.minBid}
            who={st.holder ? nameOf(st.holder) : s.auction.noBid}
          />
        )}
      >
        <p
          aria-label={s.auction.log}
          className="px-2 pt-2 text-center text-14 leading-5 text-[var(--tx2)] [text-wrap:balance]"
        >
          {shown.length === 0
            ? s.auction.logEmpty(nameOf(order[0]))
            : shown.map((c, i) => (
                <span key={h.calls.length - shown.length + i}>
                  {i > 0 && ' · '}
                  {i === shown.length - 1 ? (
                    <b className="font-bold text-[var(--tx)]">{callText(c, nameOf(c.playerId))}</b>
                  ) : (
                    callText(c, nameOf(c.playerId))
                  )}
                </span>
              ))}
        </p>
        <p role="status" aria-live="polite" className="sr-only">
          {shown.length > 0
            ? callText(shown[shown.length - 1], nameOf(shown[shown.length - 1].playerId))
            : ''}
        </p>
      </BidTable>
    </HandFrame>
  );
}
