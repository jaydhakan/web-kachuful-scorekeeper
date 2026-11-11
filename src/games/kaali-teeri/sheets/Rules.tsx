import type { ReactNode } from 'react';
import {
  cardsEach,
  deckTotal,
  defaultRules,
  MAX_PLAYERS,
  MIN_PLAYERS,
  partnersFor,
  removedCards,
  sameCard,
  type CardRef,
} from '@/games/kaali-teeri/domain';
import { useKt } from '@/games/kaali-teeri/state/store';
import { end } from '@/games/kaali-teeri/strings/end';
import { rulesText as T, type RulesNums } from '@/games/kaali-teeri/strings/rules';
import { example } from '@/games/kaali-teeri/lib/rulesExample';
import { isRed } from '@/lib/cards';
import { Icon } from '@/components/ui/Icons';

const COUNTS = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, k) => MIN_PLAYERS + k);
const R = end.rules;

/** Each card taken out once, with how many copies go ("2♣ ×2"). */
function outList(n: number): { card: CardRef; k: number }[] {
  const out: { card: CardRef; k: number }[] = [];
  for (const c of removedCards(n)) {
    const hit = out.find((x) => sameCard(x.card, c));
    if (hit) hit.k++;
    else out.push({ card: c, k: 1 });
  }
  return out;
}

/** Player counts that call the same number of partners, run together: "4–5 · 1". */
function partnerRuns(): { from: number; to: number; p: number }[] {
  const runs: { from: number; to: number; p: number }[] = [];
  for (const n of COUNTS) {
    const last = runs.at(-1);
    if (last && last.p === partnersFor(n)) last.to = n;
    else runs.push({ from: n, to: n, p: partnersFor(n) });
  }
  return runs;
}

const Card = ({ c }: { c: CardRef }) => (
  <span className={isRed(c.suit) ? 'text-suit-red' : undefined}>{end.card(c.rank, c.suit)}</span>
);

function Section({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6" aria-label={title}>
      <h3 className="disp mb-1.5 flex items-center gap-2 text-20 font-extrabold tracking-[-0.025em]">
        <span aria-hidden className="grid w-6 place-items-center">
          {icon}
        </span>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

const TH = 'py-1.5 pr-2 text-left text-13 font-bold text-[var(--tx2)]';
const TD = 'py-2 pr-2 align-top';

/** The rules with this game's settings; with no game open, the general rules for both deck counts. */
export default function Rules() {
  const { state } = useKt();
  const g = state.game;
  const n = g?.players.length ?? null;
  const r = g?.rules ?? null;
  const nums: RulesNums = {
    side: (g?.direction ?? 'cw') === 'cw' ? 'left' : 'right',
    min: r ? String(r.minBid) : '150 / 350',
    step: r ? String(r.step) : '5',
    total: r ? String(deckTotal(r.decks)) : '250 / 500',
  };
  const ex = example(r ?? defaultRules(MIN_PLAYERS));
  const tot = r ? String(deckTotal(r.decks)) : nums.total;
  return (
    <div className="text-16 leading-[1.55] text-tx-rules">
      {g && r && n && (
        <section aria-label={R.settings} className="mb-6 rounded-2xl bg-ov/[.06] p-3">
          <h3 className="mono-label pb-1 text-13 text-[var(--tx2)]">{R.settings}</h3>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-15">
            {(
              [
                [R.players, String(n)],
                [R.decks, R.deck(r.decks)],
                [R.minBid, String(r.minBid)],
                [R.step, String(r.step)],
                [R.partners, R.partnersN(r.partners)],
                [R.length, R.lengthName(r.length)],
                [R.direction, R.dirName(g.direction === 'cw')],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-[var(--tx2)]">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <Section icon={Icon.seat} title={T.dealing.title}>
        <p>{T.dealing.intro}</p>
        <table className="w-full border-collapse text-15">
          <thead>
            <tr>
              <th scope="col" className={TH}>
                {R.colPlayers}
              </th>
              <th scope="col" className={TH}>
                {R.colOut}
              </th>
              <th scope="col" className={`${TH} text-right`}>
                {R.colEach}
              </th>
            </tr>
          </thead>
          <tbody>
            {COUNTS.map((k) => {
              const out = outList(k),
                me = k === n;
              return (
                <tr
                  key={k}
                  aria-current={me ? 'true' : undefined}
                  className={`border-t border-ov/10 ${me ? 'bg-ov/[.07] font-bold' : ''}`}
                >
                  <th scope="row" className={`${TD} pl-1 text-left`}>
                    {k}
                    {me && <span className="sr-only"> · {R.thisTable}</span>}
                  </th>
                  <td className={TD}>
                    {out.length
                      ? out.map(({ card, k: c }, i) => (
                          <span key={i} className="mr-2 inline-block whitespace-nowrap">
                            <Card c={card} />
                            {c > 1 && <span className="text-[var(--tx2)]"> {R.times(c)}</span>}
                          </span>
                        ))
                      : R.none}
                  </td>
                  <td className={`${TD} tick text-right`}>{cardsEach(k)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-13 text-[var(--tx2)]">{T.dealing.order}</p>
        <p>{T.dealing.points}</p>
        <p>{T.dealing.dealer(nums)}</p>
      </Section>

      <Section icon={Icon.target} title={T.bidding.title}>
        <p>{T.bidding.turn(nums)}</p>
        <p>{T.bidding.pass}</p>
        <p>{T.bidding.forced(nums)}</p>
        <p className="rounded-2xl bg-ov/[.06] p-3">{T.bidding.quick}</p>
      </Section>

      <Section icon="♠" title={T.partners.title}>
        <p>{T.partners.trump}</p>
        <table className="w-full border-collapse text-15">
          <thead>
            <tr>
              <th scope="col" className={TH}>
                {R.colPlayers}
              </th>
              <th scope="col" className={`${TH} text-right`}>
                {R.colPartners}
              </th>
            </tr>
          </thead>
          <tbody>
            {partnerRuns().map(({ from, to, p }) => {
              const me = n != null && n >= from && n <= to;
              return (
                <tr
                  key={from}
                  aria-current={me ? 'true' : undefined}
                  className={`border-t border-ov/10 ${me ? 'bg-ov/[.07] font-bold' : ''}`}
                >
                  <th scope="row" className={`${TD} pl-1 text-left`}>
                    {from === to ? from : `${from}–${to}`}
                  </th>
                  <td className={`${TD} tick text-right`}>{p}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p>{T.partners.secret}</p>
        {(!r || r.decks === 2) && <p>{T.partners.copies}</p>}
        <p>{T.partners.lead}</p>
      </Section>

      <Section icon="🃏" title={T.tricks.title}>
        <p>{T.tricks.body}</p>
      </Section>

      <Section icon={Icon.trophy} title={T.scoring.title}>
        <p>{T.scoring.team}</p>
        <table className="w-full border-collapse text-15">
          <thead>
            <tr>
              <th scope="col" className={TH}>
                {R.colOutcome}
              </th>
              <th scope="col" className={TH}>
                {R.colTeam}
              </th>
              <th scope="col" className={TH}>
                {R.colDefenders}
              </th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                [T.scoring.made, T.scoring.bidTimes(T.scoring.bid), '0'],
                [T.scoring.missed, '0', T.scoring.plus(T.scoring.bid)],
                [T.scoring.teamSweep, T.scoring.plus(tot), '0'],
                [T.scoring.defSweep, '0', T.scoring.plus(tot)],
              ] as const
            ).map(([o, a, b]) => (
              <tr key={o} className="border-t border-ov/10">
                <th scope="row" className={`${TD} pl-1 text-left font-bold`}>
                  {o}
                </th>
                <td
                  className={`${TD} whitespace-nowrap ${a === '0' ? '' : 'font-bold text-[var(--pos)]'}`}
                >
                  {a}
                </td>
                <td
                  className={`${TD} whitespace-nowrap ${b === '0' ? '' : 'font-bold text-[var(--pos)]'}`}
                >
                  {b}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>{T.scoring.slots}</p>
        <p>{T.scoring.entering}</p>
        <p className="rounded-2xl bg-ov/[.06] p-3">{T.scoring.example(ex)}</p>
      </Section>

      <Section icon={Icon.flag} title={T.length.title}>
        {(['endless', 'to1000'] as const).map((l) => (
          <p
            key={l}
            aria-current={r?.length === l ? 'true' : undefined}
            className={r?.length === l ? 'rounded-2xl bg-ov/[.07] px-3 py-2' : undefined}
          >
            {T.length[l]}
          </p>
        ))}
      </Section>
    </div>
  );
}
