/** One line a hand about the table's status holders (REWARDS-PLAN §6.7, Spades' rule table). Pure. */
import { bySubject, cooldownLog, type BanterOf, type Mark } from '../../../progression/banter';
import { handLines } from './standings';
import type { Seat, SpGame, TeamId } from './types';

export type SpBanterKind = 'nilBroken' | 'set' | 'bagged' | 'nilMade' | 'bigMake' | 'setThem';
export type SpBanter = BanterOf<SpBanterKind>;

/** A Legend only hears the respectful lines. */
const RESPECTFUL: ReadonlySet<SpBanterKind> = new Set(['nilMade', 'bigMake', 'setThem']);
/** A team contract this big, made, is a big one. */
export const BIG_CONTRACT = 9;
const teamOf = (s: number): TeamId => (s % 2 === 0 ? 'a' : 'b');

/**
 * The line for each scored hand, in order (null where nothing fits). `marks` are keyed by seat id (`Player.id`);
 * the cooldown runs over the game.
 */
export function spBanterLog(g: SpGame, marks: ReadonlyMap<string, Mark>): (SpBanter | null)[] {
  const lines = handLines(g.hands);
  if (!marks.size) return lines.map(() => null);
  const seatOf = new Map(g.players.map((p, k) => [p.id, k as Seat]));
  const order = bySubject(marks).filter(([id]) => seatOf.has(id));
  return cooldownLog(
    lines.map((line) =>
      order.flatMap(([id, mark]) => {
        const s = seatOf.get(id)!,
          t = teamOf(s),
          own = line[t],
          them = line[t === 'a' ? 'b' : 'a'];
        const nil = own.nils.find((n) => n.seat === s);
        const out: SpBanter[] = [];
        const add = (kind: SpBanterKind) => out.push({ kind, who: id, mark });
        if (nil && !nil.made) add('nilBroken');
        if (!nil && own.made === false) add('set');
        if (own.penalty > 0) add('bagged');
        if (nil?.made) add('nilMade');
        if (!nil && own.made && own.contract >= BIG_CONTRACT) add('bigMake');
        if (them.made === false && own.made !== false) add('setThem');
        return mark === 'legend' ? out.filter((b) => RESPECTFUL.has(b.kind)) : out;
      }),
    ),
  );
}
