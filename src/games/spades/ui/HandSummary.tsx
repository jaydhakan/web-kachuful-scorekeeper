import { m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Counter } from '@/components/ui/Counter';
import { BAG_LIMIT, scoreHand, type TeamScore } from '@/games/spades/domain/scoring';
import { seatsOf } from '@/games/spades/domain/seats';
import type { Scores } from '@/games/spades/domain/standings';
import type { Card, Seat, SpHand, TeamId, TrickRec } from '@/games/spades/domain/types';
import { play as s } from '@/games/spades/strings/play';
import { sortHand } from './Hand';
import { SpCard } from './SpCard';

export interface HandSummaryProps {
  /** 1-based, as people count hands. */
  handNo: number;
  /** The finished hand; the scorer reads its bids, blind marks, team tricks and Nil tricks. */
  hand: SpHand;
  /** Each team's bags before this hand. */
  bagsBefore: Record<TeamId, number>;
  /** Totals before and after this hand. */
  before: Scores;
  after: Scores;
  /** Names by seat. */
  names: readonly string[];
  teamNames: Record<TeamId, string>;
  /** The line under the title: the target, a tie, or who won. */
  verdict: string;
  /** Count the points up (off for a reopened summary). */
  run?: boolean;
  /** Every card, when the hand was played online. */
  tricks?: readonly TrickRec[] | null;
  /** The sheet's last row: Next hand, Hold to shuffle & deal, See the winner. */
  footer?: ReactNode;
}

/** Each seat's 13 cards, read back from the tricks they played. */
export function handsFromTricks(tricks: readonly TrickRec[]): Card[][] {
  const out: Card[][] = [[], [], [], []];
  for (const t of tricks) for (const p of t.plays) out[p.seat].push(p.card);
  return out.map((h) => sortHand(h, 'up'));
}

type Tone = '' | 'pos' | 'neg' | 'gold';
const TONE: Record<Tone, string> = {
  '': '',
  pos: 'text-[var(--pos)]',
  neg: 'text-[var(--neg-tx)]',
  gold: 'text-[var(--gold-tx)]',
};
const DOT: Record<TeamId, string> = { a: 'bg-team-sun', b: 'bg-team-moon' };

function teamLines(
  r: TeamScore,
  hand: SpHand,
  names: readonly string[],
): { k: string; v: ReactNode; tone: Tone }[] {
  const [p, q] = seatsOf(r.team);
  const bidOf = (x: Seat) =>
    hand.bids[x] === 0 ? s.summary.nilBid(!!hand.blind[x]) : String(hand.bids[x] ?? s.summary.dash);
  const took = r.took + r.nils.reduce((n, x) => n + x.tricks, 0);
  const lines: { k: string; v: ReactNode; tone: Tone }[] = [
    {
      k: s.summary.bids,
      v: `${s.summary.bidOf(names[p], bidOf(p))} · ${s.summary.bidOf(names[q], bidOf(q))}`,
      tone: '',
    },
    { k: s.summary.contract, v: r.contract || s.summary.dash, tone: '' },
    { k: s.summary.took, v: took, tone: '' },
  ];
  if (r.made !== null) {
    lines.push({
      k: s.summary.result,
      v: (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-13 font-extrabold ${r.made ? 'bg-[var(--success-soft)] text-[var(--pos)]' : 'bg-[var(--danger-soft)] text-[var(--neg-tx)]'}`}
        >
          {r.made ? s.summary.made : s.summary.set}
        </span>
      ),
      tone: '',
    });
    lines.push({
      k: s.summary.contractPts,
      v: s.sign(r.made ? 10 * r.contract : -10 * r.contract),
      tone: r.made ? 'pos' : 'neg',
    });
  }
  for (const n of r.nils)
    lines.push({
      k: s.summary.nil(names[n.seat], n.blind),
      v: s.sign(n.points),
      tone: n.made ? 'gold' : 'neg',
    });
  if (r.bags) lines.push({ k: s.summary.bags, v: s.sign(r.bags), tone: '' });
  if (r.penalty) lines.push({ k: s.summary.penalty, v: s.sign(-100 * r.penalty), tone: 'neg' });
  return lines;
}

/**
 * The end-of-hand sheet's body (plan §2.5): per team the bids, contract, tricks, made or set, contract points, Nil
 * lines, bags and any penalty, then this hand's points counting up and the new total. Props only, from the domain's
 * scorer, so the scorekeeper can show the same sheet.
 */
export function HandSummary({
  handNo,
  hand,
  bagsBefore,
  before,
  after,
  names,
  teamNames,
  verdict,
  run = true,
  tricks,
  footer,
}: HandSummaryProps) {
  const res = scoreHand(hand, bagsBefore);
  const rm = useReducedMotion();
  const rise = (i: number) =>
    rm
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.34, delay: 0.2 + i * 0.045, ease: [0.22, 1, 0.36, 1] as const },
        };
  const dealt = tricks && tricks.length ? handsFromTricks(tricks) : null;
  let row = 0;
  return (
    <div data-summary={handNo}>
      <p className="mb-4 text-14 text-[var(--tx2)]">{verdict}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {(['a', 'b'] as const).map((t) => {
          const r = res[t];
          return (
            <section
              key={t}
              aria-label={teamNames[t]}
              className="min-w-0 rounded-[18px] bg-ov/[.06] p-3 shadow-[inset_0_0_0_1px_var(--hairline)]"
            >
              <h3 className="mb-2 flex items-center gap-1.5 text-15 font-bold">
                <span aria-hidden className={`h-[9px] w-[9px] rounded-full ${DOT[t]}`} />
                {teamNames[t]}
              </h3>
              <dl>
                {teamLines(r, hand, names).map((l) => (
                  <m.div
                    key={l.k}
                    {...rise(row++)}
                    className="flex justify-between gap-1.5 border-b border-[var(--hairline)] py-1 text-14"
                  >
                    <dt className="text-[var(--tx2)]">{l.k}</dt>
                    <dd className={`text-right font-bold tabular-nums ${TONE[l.tone]}`}>{l.v}</dd>
                  </m.div>
                ))}
                <m.div {...rise(row++)} className="mt-2 flex items-baseline justify-between">
                  <dt className="text-13 text-[var(--tx2)]">{s.summary.thisHand}</dt>
                  <dd className="text-32 font-bold tabular-nums tracking-[-0.03em]" data-net={t}>
                    <Counter from={0} to={r.net} run={run} duration={0.9} delay={rm ? 0 : 0.7} />
                  </dd>
                </m.div>
                <div className="flex justify-between py-1 text-14">
                  <dt className="text-[var(--tx2)]">{s.summary.total}</dt>
                  <dd className="font-bold tabular-nums" data-total={t}>
                    <Counter
                      from={before[t]}
                      to={after[t]}
                      run={run}
                      duration={0.9}
                      delay={rm ? 0 : 1.6}
                    />
                  </dd>
                </div>
                <div className="flex justify-between py-1 text-14">
                  <dt className="text-[var(--tx2)]">{s.summary.carried}</dt>
                  <dd className="font-bold tabular-nums">
                    {s.summary.carriedVal(r.bagsAfter % BAG_LIMIT)}
                  </dd>
                </div>
              </dl>
            </section>
          );
        })}
      </div>
      {dealt && (
        <details className="mt-3">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-[var(--tx2)]">
            {s.summary.allHands}
          </summary>
          {dealt.map((cs, seat) => (
            <div key={seat} className="my-1.5 flex items-center gap-1.5">
              <span className="w-[54px] shrink-0 text-13 font-semibold [overflow-wrap:anywhere]">
                {names[seat]}
              </span>
              <span className="flex flex-nowrap">
                {cs.map((c) => (
                  <SpCard
                    key={`${c.rank}${c.suit}`}
                    card={c}
                    size="mini"
                    label
                    className="-mr-2 w-[26px]"
                  />
                ))}
              </span>
            </div>
          ))}
        </details>
      )}
      {footer && <div className="mt-3.5">{footer}</div>}
    </div>
  );
}
