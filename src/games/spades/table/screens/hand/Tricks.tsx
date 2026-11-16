import { m } from 'framer-motion';
import {
  isNil,
  seatsOf,
  TRICKS,
  type SpGame,
  type SpHand,
  type TeamId,
} from '@/games/spades/domain';
import { spTable as s } from '@/games/spades/strings/table';
import { useSp } from '@/games/spades/table/state/store';
import { entryOf, entryOk, preview } from '@/games/spades/table/state/select';
import type { SpEntry } from '@/games/spades/table/state/types';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PRESS_SM } from '@/components/ui/motion';
import { vibrate } from '@/hooks/useHaptics';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { Stepper, TEAM_TONE, teamNames } from '../parts';
import { HandFrame } from './HandFrame';

/** 0–13 as one row of keys: a tap sets team A's tricks. */
function Rail({ value, onPick }: { value: number; onPick: (v: number) => void }) {
  const values = Array.from({ length: TRICKS + 1 }, (_, i) => i);
  const roving = useRovingFocus({ selected: value, columns: 'auto', orientation: 'grid' });
  return (
    <div
      role="group"
      aria-label={s.tricks.rail}
      {...roving.group}
      className="mt-4 grid grid-cols-5 gap-1.5 @[21.5rem]:grid-cols-7 @[43.5rem]:grid-cols-[repeat(14,minmax(0,1fr))]"
    >
      {values.map((v, i) => (
        <m.button
          key={v}
          type="button"
          whileTap={PRESS_SM}
          aria-label={s.tricks.railKey(v)}
          aria-pressed={v === value}
          {...roving.item(i)}
          onClick={() => {
            if (v !== value) vibrate(6);
            onPick(v);
          }}
          className={`tick grid min-h-11 min-w-0 place-items-center rounded-xl text-16 font-bold ${v === value ? TEAM_TONE.a.fill : 'mat-fill-s'}`}
        >
          {v}
        </m.button>
      ))}
    </div>
  );
}

/** How many tricks a team's Nil bidder took; with both partners Nil the second takes the rest. */
function NilAsk({ g, h, e, t }: { g: SpGame; h: SpHand; e: SpEntry; t: TeamId }) {
  const { actions } = useSp();
  const team = t === 'a' ? e.teamA : TRICKS - e.teamA;
  const [x, y] = seatsOf(t).filter((k) => isNil(h, k));
  if (x === undefined) return null;
  const nx = e.nilTricks[x] ?? 0;
  const name = g.players[x].name;
  return (
    <div className="glass mb-3 flex flex-col gap-3 p-4">
      <p className="text-16 leading-[1.4]">
        <b className="text-[var(--gold-tx)]">{s.tricks.nilQ(name, h.blind[x])}</b>
      </p>
      <Stepper
        value={nx}
        min={0}
        max={team}
        onChange={(v) => actions.setNil(x, v)}
        less={s.tricks.nilLess(name)}
        more={s.tricks.nilMore(name)}
        label={s.tricks.nilQ(name, h.blind[x])}
      />
      {y !== undefined ? (
        <p className="text-14 text-[var(--tx2)]" role="status">
          {s.tricks.doubleNil(team)} {g.players[y].name}: <b className="tick">{team - nx}</b>
        </p>
      ) : (
        nx === team &&
        team > 0 && (
          <p className="text-14 text-[var(--tx2)]" role="status">
            {s.tricks.nilMax(team)}
          </p>
        )
      )}
    </div>
  );
}

/**
 * Tricks: one big number for team A with −/+ and a 0–13 rail, team B as 13 − A, each Nil bidder's count, and both
 * teams' points for the hand before it is saved.
 */
export default function Tricks({ g, h }: { g: SpGame; h: SpHand }) {
  const { state, actions } = useSp();
  // From the props' game: a screen leaving after Save still renders, while the store has moved on.
  const e = entryOf({ game: g, entry: state.entry })!;
  const pv = preview(g, h, e);
  const ok = entryOk(h, e);
  return (
    <HandFrame
      g={g}
      h={h}
      bar={
        <>
          <PrimaryButton tone="glass" className="px-5" onClick={actions.toBids}>
            {s.tricks.back}
          </PrimaryButton>
          <PrimaryButton className="flex-1" disabled={!ok} onClick={actions.saveHand}>
            {s.tricks.save}
          </PrimaryButton>
        </>
      }
    >
      <div className="glass mb-3 p-4 text-center @container">
        <p className="mb-1 text-15 font-semibold text-[var(--tx2)]">
          {s.tricks.heading(teamNames(g, 'a'))}
        </p>
        <div className={TEAM_TONE.a.text}>
          <Stepper
            big
            value={e.teamA}
            min={0}
            max={TRICKS}
            onChange={actions.setTeamA}
            less={s.tricks.less}
            more={s.tricks.more}
            label={s.tricks.heading(teamNames(g, 'a'))}
          />
        </div>
        <Rail value={e.teamA} onPick={actions.setTeamA} />
        <p className="mt-3 text-15 text-[var(--tx2)]">
          {s.tricks.rest(teamNames(g, 'b'), e.teamA)}{' '}
          <b className={`tick text-20 ${TEAM_TONE.b.text}`}>{TRICKS - e.teamA}</b>
        </p>
      </div>
      <NilAsk g={g} h={h} e={e} t="a" />
      <NilAsk g={g} h={h} e={e} t="b" />
      <div className="grid grid-cols-2 gap-2" aria-live="polite">
        {(['a', 'b'] as const).map((t) => {
          const r = pv[t];
          return (
            <div
              key={t}
              className="glass flex flex-col gap-0.5 px-3 py-2.5 text-13 text-[var(--tx2)]"
            >
              <span className="flex items-center gap-1.5 font-semibold">
                <span aria-hidden className={`h-2 w-2 rounded-full ${TEAM_TONE[t].dot}`} />
                {s.tricks.preview(s.team(t))}
              </span>
              <b
                className={`disp tick text-24 ${r.points >= 0 ? 'text-[var(--pos)]' : 'text-[var(--neg)]'}`}
              >
                {s.sgn(r.points)}
              </b>
              <span>
                {r.made === null
                  ? s.tricks.double
                  : r.made
                    ? s.tricks.made(r.contract)
                    : s.tricks.set(r.contract)}
                {r.bags ? ` · ${s.tricks.bags(r.bags)}` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </HandFrame>
  );
}
