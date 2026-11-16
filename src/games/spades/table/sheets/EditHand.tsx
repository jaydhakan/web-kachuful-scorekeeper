import { useState } from 'react';
import {
  bidOrder,
  bidProblem,
  blindAllowed,
  isNil,
  seatsOf,
  TRICKS,
  type Seat,
  type SpHand,
} from '@/games/spades/domain';
import { spTable } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { fitEntry } from '@/games/spades/table/state/select';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ToggleTrack } from '@/components/ui/Toggle';
import { Stepper, TEAM_TONE, teamNames } from '@/games/spades/table/screens/parts';

const e = spTable.edit;

/** Edit a scored hand: every bid (in bidding order), Blind Nil where the rules allow it, and the tricks. */
export default function EditHand() {
  const { state, actions } = useSp();
  const g = state.game;
  const i = state.sheet?.type === 'edit' ? state.sheet.i : -1;
  const h0 = g?.hands[i];
  const [bids, setBids] = useState<number[]>(() => (h0?.bids as number[]) ?? []);
  const [blind, setBlind] = useState<boolean[]>(() => h0?.blind ?? []);
  const [tricks, setTricks] = useState(() => ({
    teamA: h0?.teamTricks?.[0] ?? 0,
    nilTricks: h0?.nilTricks ?? [null, null, null, null],
  }));
  if (!g || !h0 || h0.phase !== 'done') return null;
  const h: Pick<SpHand, 'bids'> = { bids };
  const fit = fitEntry(h, { index: i, ...tricks });
  // Bids are checked in the order they were made, as the rules apply them.
  const so: (number | null)[] = [null, null, null, null];
  const badBids = bidOrder(h0.dealer).some((k) => {
    const bad = bidProblem(bids[k], k, so, g.rules);
    so[k] = bids[k];
    return !!bad;
  });
  const setBid = (k: Seat, v: number) => {
    setBids((b) => b.map((x, j) => (j === k ? v : x)));
    if (v !== 0) setBlind((b) => b.map((x, j) => (j === k ? false : x)));
    setTricks((t) => ({
      ...t,
      nilTricks: t.nilTricks.map((n, j) => (j === k ? (v === 0 ? (n ?? 0) : null) : n)),
    }));
  };
  const setNil = (k: Seat, v: number) =>
    setTricks((t) => ({ ...t, nilTricks: t.nilTricks.map((n, j) => (j === k ? v : n)) }));
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="mono-label text-13 text-[var(--tx2)]">{e.bids}</h3>
        {bidOrder(h0.dealer).map((k) => {
          const p = g.players[k];
          return (
            <div key={k} className="glass flex flex-col gap-2 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-16 font-bold">
                  <span
                    aria-hidden
                    className={`h-2 w-2 rounded-full ${TEAM_TONE[k % 2 ? 'b' : 'a'].dot}`}
                  />
                  {p.name}
                </span>
                <Stepper
                  value={bids[k]}
                  min={g.rules.nil ? 0 : 1}
                  max={13}
                  onChange={(v) => setBid(k, v)}
                  less={e.less(e.bidFor(p.name))}
                  more={e.more(e.bidFor(p.name))}
                  label={e.bidFor(p.name)}
                  show={(v) => (v === 0 ? spTable.nil : String(v))}
                />
              </div>
              {bids[k] === 0 && blindAllowed(g.rules) && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!blind[k]}
                  onClick={() => setBlind((b) => b.map((x, j) => (j === k ? !x : x)))}
                  className="flex min-h-11 items-center justify-between gap-3 text-left text-15"
                >
                  {e.blindFor(p.name)}
                  <ToggleTrack on={!!blind[k]} />
                </button>
              )}
            </div>
          );
        })}
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="mono-label text-13 text-[var(--tx2)]">{e.tricks}</h3>
        <div className="glass flex flex-col items-center gap-2 px-3 py-3">
          <span className="text-15 font-semibold">{e.teamA(teamNames(g, 'a'))}</span>
          <Stepper
            value={fit.teamA}
            min={0}
            max={TRICKS}
            onChange={(v) => setTricks((t) => ({ ...t, teamA: v }))}
            less={e.less(e.teamA(teamNames(g, 'a')))}
            more={e.more(e.teamA(teamNames(g, 'a')))}
            label={e.teamA(teamNames(g, 'a'))}
          />
          <span className="text-14 text-[var(--tx2)]">
            {spTable.tricks.rest(teamNames(g, 'b'), fit.teamA)}{' '}
            <b className="tick">{TRICKS - fit.teamA}</b>
          </span>
        </div>
        {(['a', 'b'] as const).map((t) => {
          const [x] = seatsOf(t).filter((k) => isNil(h, k));
          if (x === undefined) return null;
          const team = t === 'a' ? fit.teamA : TRICKS - fit.teamA;
          const name = g.players[x].name;
          return (
            <div key={t} className="glass flex flex-col items-center gap-2 px-3 py-3">
              <span className="text-15 font-semibold">{e.nilFor(name)}</span>
              <Stepper
                value={fit.nilTricks[x] ?? 0}
                min={0}
                max={team}
                onChange={(v) => setNil(x, v)}
                less={e.less(e.nilFor(name))}
                more={e.more(e.nilFor(name))}
                label={e.nilFor(name)}
              />
            </div>
          );
        })}
      </section>
      {badBids && (
        <p role="alert" className="text-14 text-[var(--warn)]">
          {e.problem}
        </p>
      )}
      <PrimaryButton
        className="w-full"
        disabled={badBids}
        onClick={() =>
          actions.editHand(i, {
            bids,
            blind: bids.map((v, k) => v === 0 && !!blind[k]),
            teamA: fit.teamA,
            nilTricks: fit.nilTricks,
          })
        }
      >
        {e.save}
      </PrimaryButton>
    </div>
  );
}
