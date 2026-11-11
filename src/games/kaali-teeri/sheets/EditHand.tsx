import { useId, useState, type ReactNode } from 'react';
import {
  RANKS,
  SUITS,
  copyNeeded,
  deckTotal,
  enteredPoints,
  teamPointsFrom,
  validate,
  type CardRef,
  type Copy,
  type CountedBy,
  type KtGame,
  type KtInvalidReason,
  type Rank,
  type Suit,
} from '@/games/kaali-teeri/domain';
import type { KtHandEdit } from '@/games/kaali-teeri/state/types';
import { useKt } from '@/games/kaali-teeri/state/store';
import { kp } from '@/games/kaali-teeri/strings/play';
import { BidStepper } from '@/components/ui/BidKeypad';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Seg } from '@/components/ui/Seg';
import { TR } from '@/theme/trumps';

/** The hand as the Edit sheet first shows it: exactly what was confirmed, with the number the table typed. */
function draftOf(g: KtGame, i: number): KtHandEdit | null {
  const h = g.hands[i];
  if (!h || h.phase !== 'done' || h.bidder == null || h.bid == null || h.trump == null) return null;
  return {
    bidder: h.bidder,
    bid: h.bid,
    trump: h.trump,
    called: h.called.map((c) => ({ ...c })),
    playedBy: h.playedBy.map((p) => p ?? ''),
    entered: enteredPoints(h, g.rules) ?? 0,
    countedBy: h.countedBy ?? 'defenders',
  };
}

/** The upload check is the rule (the reducer applies the same): the first thing wrong with the edited hand. */
export function editProblem(g: KtGame, i: number, d: KtHandEdit): KtInvalidReason | null {
  if (d.playedBy.some((p) => !p)) return 'played_by';
  const total = deckTotal(g.rules.decks);
  if (d.entered % 5 !== 0 || d.entered < 0 || d.entered > total) return 'team_points';
  const h = g.hands[i];
  const keep = h.mode === 'auction' && d.bidder === h.bidder && d.bid === h.bid;
  const hands = g.hands.map((x, k) =>
    k === i
      ? {
          ...x,
          mode: keep ? x.mode : ('quick' as const),
          calls: keep ? x.calls : [],
          bidder: d.bidder,
          bid: d.bid,
          trump: d.trump,
          called: d.called,
          playedBy: d.playedBy,
          countedBy: d.countedBy,
          teamPoints: teamPointsFrom(d.entered, d.countedBy, total),
        }
      : x,
  );
  return validate({ ...g, hands }, Infinity)?.reason ?? null;
}

/** Plan §3 screen 10: everything about a done hand; totals recompute, as they're never stored. */
export default function EditHand() {
  const { state, actions } = useKt();
  const [sheet] = useState(state.sheet);
  const g = state.game;
  const i = sheet?.type === 'edit' ? sheet.i : -1;
  const [d, setD] = useState(() => (g ? draftOf(g, i) : null));
  if (!g || !d || !g.hands[i])
    return <p className="py-5 text-16 text-[var(--tx2)]">{kp.edit.missing}</p>;
  const n = g.players.length,
    total = deckTotal(g.rules.decks),
    step = g.rules.step;
  const set = (patch: Partial<KtHandEdit>) => setD({ ...d, ...patch });
  const setCard = (k: number, c: CardRef) => {
    const card: CardRef = { rank: c.rank, suit: c.suit };
    if (copyNeeded(card, n)) card.copy = c.copy ?? 1;
    const playedBy = [...d.playedBy];
    if (card.copy === 'other' && playedBy[k] === d.bidder) playedBy[k] = '';
    set({ called: d.called.map((x, j) => (j === k ? card : x)), playedBy });
  };
  const problem = editProblem(g, i, d);
  const why = (r: KtInvalidReason) =>
    problem === r ? (
      <p role="alert" className="mt-1.5 text-14 font-medium text-[var(--warn)]">
        {kp.edit.why[r]}
      </p>
    ) : null;
  const known: KtInvalidReason[] = ['bid', 'trump', 'called', 'played_by', 'team_points'];
  return (
    <>
      <Field label={kp.edit.bidder}>
        {(id) => (
          <Select id={id} value={d.bidder} onChange={(v) => set({ bidder: v })}>
            {g.players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={kp.edit.bid} group>
        {() => (
          <>
            <BidStepper
              value={d.bid}
              min={g.rules.minBid}
              max={total}
              step={step}
              quick={[-5 * step, -step, step, 5 * step]}
              label={kp.edit.bid}
              onChange={(bid) => set({ bid })}
            />
            {why('bid')}
          </>
        )}
      </Field>
      <Field label={kp.edit.trump} group>
        {() => (
          <>
            <Seg<Suit>
              uid="kt-edit-trump"
              label={kp.edit.trump}
              value={d.trump}
              onChange={(trump) => set({ trump })}
              className="w-full [&>button]:flex-1"
              options={SUITS.map((s) => ({
                v: s,
                label: (
                  <>
                    <span aria-hidden className="text-22" style={{ color: TR[s].col }}>
                      {TR[s].sym}
                    </span>
                    <span className="sr-only">{kp.suitName(s)}</span>
                  </>
                ),
              }))}
            />
            {why('trump')}
          </>
        )}
      </Field>
      <Field label={kp.edit.called} group>
        {() => (
          <>
            {d.called.map((c, k) => (
              <fieldset key={k} className="glass mb-2 grid gap-2 p-3">
                <legend className="mb-1 text-14 font-bold">{kp.edit.card(k + 1)}</legend>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    label={kp.edit.rank}
                    value={c.rank}
                    onChange={(v) => setCard(k, { ...c, rank: v as Rank })}
                  >
                    {RANKS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label={kp.edit.suit}
                    value={c.suit}
                    onChange={(v) => setCard(k, { ...c, suit: v as Suit })}
                  >
                    {SUITS.map((s) => (
                      <option key={s} value={s}>
                        {TR[s].sym} {kp.suitName(s)}
                      </option>
                    ))}
                  </Select>
                </div>
                {c.copy !== undefined && (
                  <Seg<string>
                    uid={'kt-edit-copy' + k}
                    label={kp.edit.copy}
                    size="sm"
                    value={String(c.copy)}
                    onChange={(v) =>
                      setCard(k, { ...c, copy: (v === 'other' ? v : Number(v)) as Copy })
                    }
                    className="w-full [&>button]:flex-1"
                    options={(['1', '2', 'other'] as const).map((v) => ({
                      v,
                      label: kp.edit.copyShort[v],
                    }))}
                  />
                )}
                <Select
                  label={kp.edit.playedBy}
                  value={d.playedBy[k] ?? ''}
                  onChange={(v) => set({ playedBy: d.playedBy.map((p, j) => (j === k ? v : p)) })}
                >
                  <option value="" disabled>
                    {kp.play.playedBy}
                  </option>
                  {g.players
                    .filter((p) => !(c.copy === 'other' && p.id === d.bidder))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </Select>
              </fieldset>
            ))}
            {why('called')}
            {why('played_by')}
          </>
        )}
      </Field>
      <Field label={kp.edit.points} group>
        {() => (
          <>
            <Seg<CountedBy>
              uid="kt-edit-side"
              label={kp.result.side}
              value={d.countedBy}
              onChange={(countedBy) => set({ countedBy })}
              className="mb-3 w-full [&>button]:flex-1"
              options={[
                { v: 'defenders', label: kp.result.defenders },
                { v: 'bidders', label: kp.result.biddersShort },
              ]}
            />
            <BidStepper
              value={d.entered}
              min={0}
              max={total}
              step={5}
              quick={[-25, -5, 5, 25]}
              label={kp.result.amount(d.countedBy)}
              onChange={(entered) => set({ entered })}
            />
            {why('team_points')}
          </>
        )}
      </Field>
      {problem && !known.includes(problem) && (
        <p role="alert" className="py-2 text-14 font-medium text-[var(--warn)]">
          {kp.edit.why.other}
        </p>
      )}
      <PrimaryButton
        className="mt-2 w-full"
        disabled={!!problem}
        onClick={() => actions.editHand(i, d)}
      >
        {kp.edit.save}
      </PrimaryButton>
    </>
  );
}

/** A labelled section: a <label> for one control, or a named group for several. */
function Field({
  label,
  group,
  children,
}: {
  label: string;
  group?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return group ? (
    <section aria-labelledby={id + 'l'} className="mb-4">
      <h3 id={id + 'l'} className="mb-1.5 text-15 font-bold">
        {label}
      </h3>
      {children(id)}
    </section>
  ) : (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-15 font-bold">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  const box = (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mat-inp h-12 w-full min-w-0 rounded-2xl px-3 text-17 font-normal text-[var(--tx)]"
    >
      {children}
    </select>
  );
  return label ? (
    <label className="grid min-w-0 gap-1 text-13 font-medium text-[var(--tx2)]">
      {label}
      {box}
    </label>
  ) : (
    box
  );
}
