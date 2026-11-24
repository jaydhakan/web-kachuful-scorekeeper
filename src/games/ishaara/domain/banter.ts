/** One line a turn about the table's status holders (REWARDS-PLAN §6.7, Ishaara's rule table). Pure. */
import { bySubject, cooldownLog, type BanterOf, type Mark } from '../../../progression/banter';
import type { IshaaraPublic, LogEntry, Team } from './types';

export type IshBanterKind = 'trapped' | 'wrong' | 'bigClue' | 'cleanTurn';
export type IshBanter = BanterOf<IshBanterKind>;

/** A Legend only hears the respectful lines. */
const RESPECTFUL: ReadonlySet<IshBanterKind> = new Set(['bigClue', 'cleanTurn']);
/** A clue that finds this many of the team's words in one turn is a big one. */
export const BIG_CLUE = 3;

/** The game's turns from its log: each clue and the guesses that followed it. */
export function turnsOf(log: readonly LogEntry[]): { team: Team; guesses: LogEntry[] }[] {
  const out: { team: Team; guesses: LogEntry[] }[] = [];
  for (const e of log) {
    if (e.type === 'clue') out.push({ team: e.team, guesses: [] });
    else if (e.type === 'guess' && out.length) out.at(-1)!.guesses.push(e);
  }
  return out;
}

/** The line for each turn, in order (null where nothing fits); `marks` by seat id, the cooldown over the game. */
export function ishBanterLog(
  g: IshaaraPublic,
  marks: ReadonlyMap<string, Mark>,
): (IshBanter | null)[] {
  const turns = turnsOf(g.log ?? []);
  if (!marks.size) return turns.map(() => null);
  const seat = new Map((g.players ?? []).map((p) => [p.id, p]));
  const order = bySubject(marks).filter(([id]) => seat.has(id));
  return cooldownLog(
    turns.map((t) =>
      order.flatMap(([id, mark]) => {
        const p = seat.get(id)!;
        if (p.team !== t.team) return [];
        const own = t.guesses.filter((x) => x.identity === t.team).length;
        const out: IshBanter[] = [];
        const add = (kind: IshBanterKind) => out.push({ kind, who: id, mark });
        if (t.guesses.some((x) => x.identity === 'trap')) add('trapped');
        else if (
          t.guesses.some((x) => x.identity && x.identity !== t.team && x.identity !== 'blank')
        )
          add('wrong');
        if (p.role === 'clue-giver' && own >= BIG_CLUE) add('bigClue');
        if (p.role === 'clue-giver' && own >= 2 && own === t.guesses.length) add('cleanTurn');
        return mark === 'legend' ? out.filter((b) => RESPECTFUL.has(b.kind)) : out;
      }),
    ),
  );
}
