/** One line a hand about the table's status holders (REWARDS-PLAN §6.7, Kaali Teeri's rule table). Pure. */
import { bySubject, cooldownLog, type BanterOf, type Mark } from '../../../progression/banter';
import { deckTotal } from './cards';
import { doneHands, result, team, totals } from './scoring';
import type { KtGame, KtHand } from './types';

export type KtBanterKind =
  'swept' | 'bidFail' | 'partnerFail' | 'sweep' | 'bigMake' | 'stopped' | 'passed';
export type KtBanter = BanterOf<KtBanterKind>;

const MEDAL: Partial<Record<Mark, number>> = { gold: 1, silver: 2, bronze: 3 };
/** A Legend only hears the respectful lines. */
const RESPECTFUL: ReadonlySet<KtBanterKind> = new Set(['sweep', 'bigMake', 'stopped']);
/** A bid this share of the deck or more, made, is a big one. */
export const BIG_SHARE = 0.8;

function aboutHolder(g: KtGame, h: KtHand, id: string, mark: Mark): KtBanter[] {
  const r = result(h, g.rules);
  if (!r || h.bid == null) return [];
  const side = team(h);
  const bidder = h.bidder === id,
    partner = !bidder && side.includes(id),
    defender = !side.includes(id);
  const out: KtBanter[] = [];
  const add = (kind: KtBanterKind) => out.push({ kind, who: id, mark });
  if (bidder && r.sweep === 'defenders') add('swept');
  if (bidder && !r.made) add('bidFail');
  if (partner && !r.made) add('partnerFail');
  if ((bidder || partner) && r.sweep === 'bidders') add('sweep');
  if (bidder && r.made && h.bid >= deckTotal(g.rules.decks) * BIG_SHARE) add('bigMake');
  if (defender && !r.made) add('stopped');
  return mark === 'legend' ? out.filter((b) => RESPECTFUL.has(b.kind)) : out;
}

/** A Wazir or Senapati who passed a higher medallist in this game's score with this hand. */
function passed(
  marks: ReadonlyMap<string, Mark>,
  before: Record<string, number>,
  after: Record<string, number>,
): KtBanter[] {
  const medal = (id: string) => MEDAL[marks.get(id)!];
  const ids = [...marks.keys()].filter((id) => medal(id) != null && id in after);
  const out: KtBanter[] = [];
  for (const who of ids)
    for (const other of ids)
      if (medal(who)! > medal(other)! && before[who] <= before[other] && after[who] > after[other])
        out.push({
          kind: 'passed',
          who,
          mark: marks.get(who)!,
          other,
          otherMark: marks.get(other)!,
        });
  return out.sort((a, b) => MEDAL[a.otherMark!]! - MEDAL[b.otherMark!]!);
}

/** The line for each hand done, in order (null where nothing fits); the cooldown runs over the game. */
export function ktBanterLog(g: KtGame, marks: ReadonlyMap<string, Mark>): (KtBanter | null)[] {
  const done = doneHands(g);
  if (!marks.size) return done.map(() => null);
  const order = bySubject(marks);
  return cooldownLog(
    done.map((h, i) => [
      ...order.flatMap(([id, m]) => aboutHolder(g, h, id, m)),
      ...passed(marks, totals(g, done.slice(0, i)), totals(g, done.slice(0, i + 1))),
    ]),
  );
}
