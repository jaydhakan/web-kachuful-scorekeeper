import { deckTotal, type KtGame, type KtHand } from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { ktBidding } from '@/games/kaali-teeri/strings/bidding';
import { ktDesk as kd } from '@/games/kaali-teeri/strings/desk';
import { KeyHints } from '@/components/desk/DeskParts';
import { Avatar } from '@/components/ui/Avatar';
import { BidStepper } from '@/components/ui/BidKeypad';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ModeSwitch } from '../hand/bidding/ModeSwitch';
import { quickSteps } from '../hand/bidding/QuickBid';
import { callText, type auctionView } from '../hand/bidding/auctionView';

const s = ktBidding;

/** Who the row is about: avatar, name set big, and a line under it. */
function Who({ p, line }: { p: KtGame['players'][number] | null; line: string }) {
  return (
    <div className="flex min-h-14 items-center gap-3">
      {p && (
        <Avatar
          p={p}
          className="mat-av grid h-12 w-12 shrink-0 place-items-center rounded-full text-26"
        />
      )}
      <p className="min-w-0 flex-1 leading-tight">
        {p && (
          <span className="disp block text-24 font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere]">
            {p.name}
          </span>
        )}
        <span className={p ? 'text-15 text-[var(--tx2)]' : 'text-18 font-bold'}>{line}</span>
      </p>
    </div>
  );
}

interface QuickPaneProps {
  g: KtGame;
  seat: number | null;
  amount: number;
  onAmount: (v: number) => void;
  onConfirm: () => void;
}

/** Quick mode: the winner is picked on the table (or with ← →), the amount set here, then confirmed. */
export function QuickPane({ g, seat, amount, onAmount, onConfirm }: QuickPaneProps) {
  const { minBid, step, decks } = g.rules;
  const max = deckTotal(decks);
  const p = seat == null ? null : g.players[seat];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ModeSwitch />
      <Who p={p} line={p ? kd.quick.picked : kd.quick.pickSeat} />
      <p className="text-13 text-[var(--tx2)]">{s.quick.range(minBid, step, max)}</p>
      <div className="mt-auto flex flex-col gap-3">
        <BidStepper
          label={s.quick.amount}
          value={amount}
          onChange={onAmount}
          min={minBid}
          max={max}
          step={step}
          quick={quickSteps(step)}
        />
        <PrimaryButton className="w-full" disabled={!p} onClick={onConfirm}>
          {p ? s.quick.confirm(p.name, amount) : s.quick.tapSeat}
        </PrimaryButton>
        <KeyHints
          items={[
            ['← →', kd.hints.seat],
            ['↑ ↓', kd.hints.amount],
            ['⏎', kd.hints.confirm],
            ['M', kd.hints.mode],
          ]}
        />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {p ? s.quick.picked(p.name) : ''}
      </p>
    </div>
  );
}

interface AuctionPaneProps {
  g: KtGame;
  h: KtHand;
  v: ReturnType<typeof auctionView>;
  amount: number;
  onAmount: (v: number) => void;
}

/** The full auction: whose turn, the amount, Pass or Bid, and the log of calls so far. */
export function AuctionPane({ g, h, v, amount, onAmount }: AuctionPaneProps) {
  const { actions } = useKt();
  const { st, min, max, speaker, canPass, shown, nameOf, order } = v;
  const last = shown.at(-1);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ModeSwitch />
      {speaker && (
        <Who
          p={speaker}
          line={
            st.forcedTo
              ? s.auction.mustTake
              : `${s.auction.toBid} · ${min != null ? s.auction.atLeast(min) : s.auction.onlyPass}`
          }
        />
      )}
      <p
        aria-label={s.auction.log}
        className="text-14 leading-5 text-[var(--tx2)] [text-wrap:pretty]"
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
        {last ? callText(last, nameOf(last.playerId)) : ''}
      </p>
      {speaker && (
        <div className="mt-auto flex flex-col gap-3">
          {st.forcedTo ? (
            <>
              <p className="text-14 font-medium text-[var(--warn)]">
                {s.auction.forcedNote(nameOf(st.forcedTo), g.rules.minBid)}
              </p>
              <PrimaryButton className="w-full" onClick={() => actions.call('forced')}>
                {s.auction.takeIt(g.rules.minBid)}
              </PrimaryButton>
            </>
          ) : (
            <>
              {min != null && (
                <BidStepper
                  label={s.auction.amount(speaker.name)}
                  value={amount}
                  onChange={onAmount}
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
          <KeyHints
            items={[
              ['↑ ↓', kd.hints.amount],
              ['⏎', kd.hints.confirm],
              ['P', kd.hints.pass],
              ['M', kd.hints.mode],
            ]}
          />
        </div>
      )}
    </div>
  );
}
