import { AnimatePresence, m } from 'framer-motion';
import { deckTotal, team, type CountedBy } from '@/games/kaali-teeri/domain';
import { curHand, preview, shownPoints } from '@/games/kaali-teeri/state/select';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kp } from '@/games/kaali-teeri/strings/play';
import { Avatar } from '@/components/ui/Avatar';
import { BidStepper } from '@/components/ui/BidKeypad';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { PRESS, SPRING_POP } from '@/components/ui/motion';
import { stagger } from '@/components/ui/stagger';
import { sgnN } from '@/lib/format';
import { HandFrame } from './parts/HandFrame';
import { CardName, Pill, RoleBadge, cardText, roleOf } from './parts/bits';

const QUICK = [-25, -5, 5, 25];

/** Plan §3 screen 7: either side's points (the defenders' by default), every called card's player, then Confirm. */
export default function Result() {
  const { state, actions } = useKt();
  const g = state.game;
  const h = g && curHand(g);
  if (!g || !h || h.bidder == null || h.bid == null) return null;
  const total = deckTotal(g.rules.decks);
  const bidder = g.players.find((p) => p.id === h.bidder)!;
  const by: CountedBy = h.countedBy ?? state.prefs.countedBy;
  // Until a number is set, the stepper starts where the bid is exactly made; Confirm takes what is shown.
  const entered = shownPoints(g, h) ?? (by === 'bidders' ? h.bid : total - h.bid);
  const pv = preview(g, entered, by);
  const unmarked = h.called.flatMap((c, i) => (h.playedBy[i] == null ? [{ c, i }] : []));
  const ready = unmarked.length === 0;
  const mates = team(h).map((id) => g.players.find((p) => p.id === id)!);
  const tp = pv?.teamPoints ?? 0;
  // The bidding team first, as the screen talks about them; then the defenders in seat order.
  const order = [...mates, ...g.players.filter((p) => !mates.includes(p))];
  const confirm = () => {
    if (shownPoints(g, h) == null) actions.points(entered);
    actions.confirmHand();
  };
  return (
    <HandFrame
      g={g}
      h={h}
      points
      title={kp.result.question(by)}
      navLeft={
        <IconButton label={kp.hand.back} onClick={actions.toPlay}>
          {Icon.back}
        </IconButton>
      }
      barNote={ready ? '' : kp.result.needMarks(unmarked.length)}
      bar={
        <PrimaryButton className="flex-1" disabled={!ready} onClick={confirm}>
          {kp.result.confirm(h.index + 1)}
        </PrimaryButton>
      }
    >
      <Seg<CountedBy>
        uid="kt-side"
        label={kp.result.side}
        value={by}
        onChange={actions.countedBy}
        className="mb-3 w-full [&>button]:flex-1"
        options={[
          { v: 'defenders', label: kp.result.defenders },
          { v: 'bidders', label: kp.result.bidders(bidder.name) },
        ]}
      />
      <div className="mb-3 flex items-center gap-2">
        <span className="flex shrink-0 gap-1">
          {mates.map((p) => (
            <Avatar
              key={p.id}
              p={p}
              className="mat-av grid h-9 w-9 place-items-center rounded-full text-18"
            />
          ))}
        </span>
        <span className="min-w-0 text-15 text-[var(--tx2)]">
          {kp.result.need(
            mates.map((p) => p.name),
            h.bid,
          )}
        </span>
      </div>

      {!ready && (
        <section aria-labelledby="kt-unmarked" className="glass mb-3 p-3">
          <h2 id="kt-unmarked" className="text-16 font-bold">
            {kp.result.markFirst}
          </h2>
          <p className="mb-2 text-14 text-[var(--tx2)]">{kp.result.markNote}</p>
          <div className="grid gap-2">
            {unmarked.map(({ c, i }) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="text-20 font-extrabold">
                  <CardName c={c} />
                </span>
                <m.button
                  type="button"
                  whileTap={PRESS}
                  aria-label={kp.play.hidden(cardText(c))}
                  onClick={() => actions.openSheet({ type: 'playedBy', i })}
                  className="mat-fill min-h-12 rounded-2xl px-4 text-16 font-bold text-ink-on-accent"
                >
                  {kp.play.playedBy}
                </m.button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="glass p-3">
        <BidStepper
          value={entered}
          min={0}
          max={total}
          step={5}
          quick={QUICK}
          label={kp.result.amount(by)}
          onChange={actions.points}
        />
      </div>
      <div
        className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5"
        role="status"
        aria-live="polite"
      >
        <span className="text-14 text-[var(--tx2)]">
          {kp.result.range(total)} · {kp.result.flow(by, entered, total - entered, bidder.name)}
        </span>
        {pv && <Outcome made={pv.made} sweep={pv.sweep} over={tp - h.bid} />}
      </div>

      <section aria-label={kp.result.changes} className="glass mt-3 overflow-hidden">
        {order.map((p, k) => {
          const role = ready ? roleOf(h, p.id) : p.id === h.bidder ? 'bidder' : null;
          const d = pv?.scores[p.id] ?? 0;
          const sl = pv?.slots[p.id] ?? 0;
          return (
            <m.div
              key={p.id}
              {...stagger(k)}
              className="relative flex min-h-14 items-center gap-2.5 px-3 py-2"
            >
              {k > 0 && (
                <span aria-hidden className="absolute left-14 right-2 top-0 h-px bg-ov/10" />
              )}
              <Avatar
                p={p}
                className="mat-av grid h-10 w-10 shrink-0 place-items-center rounded-full text-22"
              />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 max-w-full break-words text-17 font-bold leading-[1.2]">
                  {p.name}
                </span>
                {role && <RoleBadge kind={role} />}
                {ready && pv?.made && pv.sweep === 'none' && sl > 1 && (
                  <Pill>{kp.role.slots(sl)}</Pill>
                )}
                {ready && pv && pv.sweep !== 'none' && d > 0 && <Pill>{kp.role.sweep}</Pill>}
              </div>
              <b
                className={`disp tick shrink-0 text-right text-22 font-extrabold ${!ready ? 'font-normal text-[var(--dis)]' : d > 0 ? 'text-[var(--pos)]' : 'text-[var(--tx2)]'}`}
              >
                {ready ? sgnN(d) : '—'}
              </b>
            </m.div>
          );
        })}
      </section>
    </HandFrame>
  );
}

function Outcome({ made, sweep, over }: { made: boolean; sweep: string; over: number }) {
  const text =
    sweep === 'bidders'
      ? kp.result.sweepBidders
      : sweep === 'defenders'
        ? kp.result.sweepDefenders
        : made
          ? kp.result.made(over)
          : kp.result.missed(-over);
  const good = sweep === 'bidders' || (made && sweep === 'none');
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <m.span
        key={text}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={SPRING_POP}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-14 font-extrabold uppercase tracking-[0.005em] ${good ? 'bg-[var(--success-soft)] text-[var(--pos)]' : 'bg-[var(--danger-soft)] text-[var(--neg-tx)]'}`}
      >
        <span aria-hidden>{good ? kp.board.made : kp.board.missed}</span>
        {text}
      </m.span>
    </AnimatePresence>
  );
}
