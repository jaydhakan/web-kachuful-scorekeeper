import { roundAt, totalRounds, type Game } from '@/domain';
import { TR } from '@/theme/trumps';
import { Eyebrow } from './DeskParts';
import { t } from '@/strings';

/** The next few rounds after `from` (exclusive): cards, trump and who deals. Stops at the last round of a set game. */
export function ComingUp({
  g,
  from,
  count = 4,
  bare,
}: {
  g: Game;
  from: number;
  count?: number;
  /** Just the cards, for inside another panel. */
  bare?: boolean;
}) {
  const left = Math.max(0, Math.min(count, totalRounds(g) - from - 1));
  if (bare && left === 0) return null;
  return (
    <div className={bare ? '' : 'glass flex flex-col gap-3 px-5 py-4'}>
      {!bare && <Eyebrow>{t.desk.comingUp}</Eyebrow>}
      {left === 0 ? (
        <p className="text-16 text-[var(--tx2)]">{t.desk.lastRound}</p>
      ) : (
        <ol
          className="grid gap-2.5"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: left }, (_, k) => {
            const i = from + 1 + k,
              r = roundAt(g, i);
            return (
              <li key={i} className="min-w-0 rounded-[14px] bg-white/5 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-1 text-13 text-[var(--tx2)]">
                  {t.desk.roundN(i + 1)}
                  {r.cards === g.maxCards && (
                    <span className="rounded-[10px] bg-[var(--gold)] px-1.5 text-13 font-extrabold leading-5 text-ink-gold">
                      {t.desk.peak}
                    </span>
                  )}
                </div>
                <div className="disp text-30 font-extrabold leading-[1.1] tracking-[-0.03em]">
                  {r.cards}{' '}
                  <span className="text-26" style={{ color: TR[r.trump].col }}>
                    {TR[r.trump].sym}
                  </span>
                </div>
                <div className="text-13 text-[var(--tx2)] [overflow-wrap:anywhere]">
                  {t.desk.deals(g.players[r.dealerIndex].name)}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
