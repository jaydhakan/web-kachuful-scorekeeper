/** One line a round about the table's status holders (REWARDS-PLAN §6.7). Pure: every phone works out the same. */
import { doneRounds } from './rounds';
import { totals } from './scoring';
import type { Game, Round } from './types';

/** What a seated player holds: a medal, Aaj ka Sitara or the Legend. */
export type Mark = 'gold' | 'silver' | 'bronze' | 'sitara' | 'legend';

export type BanterKind =
  | 'soleMiss'
  | 'outbid'
  | 'missTwice'
  | 'miss'
  | 'hooked'
  | 'bigMake'
  | 'soleMake'
  | 'nilMake'
  | 'passed';

export interface Banter {
  kind: BanterKind;
  /** Game player ids (`Player.id`, as rounds key them). */
  who: string;
  mark: Mark;
  other?: string;
  otherMark?: Mark;
}

/** Who a line is about, first to last: the Badshah before the Sitara before the Legend (§6.7 part 7). */
const SUBJECTS: readonly Mark[] = ['gold', 'sitara', 'legend'];
const MEDAL: Partial<Record<Mark, number>> = { gold: 1, silver: 2, bronze: 3 };
/** A Legend only hears the respectful lines. */
const RESPECTFUL: ReadonlySet<BanterKind> = new Set(['bigMake', 'soleMake']);
export const BIG_BID = 5;
/** The same kind of line isn't heard twice within this many rounds. */
export const COOLDOWN = 3;

type R = Pick<Round, 'bids' | 'results' | 'hookHits' | 'dealerIndex'>;

function aboutHolder(
  g: Game,
  r: R,
  prev: R | undefined,
  id: string,
  mark: Mark,
  marks: ReadonlyMap<string, Mark>,
): Banter[] {
  const ids = g.players.map((p) => p.id);
  const res = r.results,
    bid = r.bids[id] ?? 0;
  const missed = res[id] === 'missed',
    made = res[id] === 'made';
  const all = ids.every((x) => res[x]);
  const out: Banter[] = [];
  const add = (kind: BanterKind, extra: Partial<Banter> = {}) =>
    out.push({ kind, who: id, mark, ...extra });
  if (missed && all && ids.length >= 4 && ids.every((x) => x === id || res[x] === 'made'))
    add('soleMiss');
  if (missed) {
    // The boldest made bid above theirs by someone who holds nothing; the earlier seat wins a tie.
    const by = ids
      .filter((x) => !marks.has(x) && res[x] === 'made' && (r.bids[x] ?? 0) > bid)
      .sort((a, b) => (r.bids[b] ?? 0) - (r.bids[a] ?? 0))[0];
    if (by) add('outbid', { other: by });
    if (prev?.results[id] === 'missed') add('missTwice');
    add('miss');
  }
  if (ids[r.dealerIndex] === id && (r.hookHits || 0) >= 1) add('hooked');
  if (made && bid >= BIG_BID) add('bigMake');
  if (made && all && ids.length >= 3 && ids.every((x) => x === id || res[x] === 'missed'))
    add('soleMake');
  if (made && bid === 0) add('nilMake');
  return mark === 'legend' ? out.filter((b) => RESPECTFUL.has(b.kind)) : out;
}

/** A Wazir or Senapati who went from behind a higher medallist in this game's score to ahead of them. */
function passed(
  marks: ReadonlyMap<string, Mark>,
  before: Record<string, number>,
  after: Record<string, number>,
): Banter[] {
  const medal = (id: string) => MEDAL[marks.get(id)!];
  const medallists = [...marks.keys()].filter((id) => medal(id) != null && id in after);
  const out: Banter[] = [];
  for (const who of medallists)
    for (const other of medallists) {
      if (medal(who)! <= medal(other)!) continue;
      if (before[who] <= before[other] && after[who] > after[other])
        out.push({
          kind: 'passed',
          who,
          mark: marks.get(who)!,
          other,
          otherMark: marks.get(other)!,
        });
    }
  return out.sort((a, b) => MEDAL[a.otherMark!]! - MEDAL[b.otherMark!]!);
}

/** Every candidate line for one round, best first. */
function candidates(g: Game, done: Round[], i: number, marks: ReadonlyMap<string, Mark>): Banter[] {
  const r = done[i],
    prev = done[i - 1];
  const out: Banter[] = [];
  for (const mark of SUBJECTS)
    for (const [id, m] of marks) if (m === mark) out.push(...aboutHolder(g, r, prev, id, m, marks));
  out.push(...passed(marks, totals(g, done.slice(0, i)), totals(g, done.slice(0, i + 1))));
  return out;
}

/**
 * The line for each round done, in order (null where nothing fits). The cooldown makes a round's line depend on the
 * ones before it, so the whole game is worked out at once.
 */
export function banterLog(g: Game, marks: ReadonlyMap<string, Mark>): (Banter | null)[] {
  if (!marks.size) return doneRounds(g).map(() => null);
  const done = doneRounds(g);
  const log: (Banter | null)[] = [];
  done.forEach((_, i) => {
    const recent = new Set(log.slice(Math.max(0, i - (COOLDOWN - 1))).map((b) => b?.kind));
    log.push(candidates(g, done, i, marks).find((b) => !recent.has(b.kind)) ?? null);
  });
  return log;
}

/** A stable pick from a pool, the same on every phone for the same game and round. */
export function pickIndex(seed: string, n: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return (h >>> 0) % Math.max(1, n);
}
