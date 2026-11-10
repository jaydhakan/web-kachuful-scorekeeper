import type { ReactNode } from 'react';
import { clueGiverOf, type IshaaraPublic, type LogEntry, type Team } from '@/games/ishaara/domain';
import { ipg } from '@/games/ishaara/strings/pages';
import { Icon } from '@/components/ui/Icons';
import { CARD_FACE, Mark, TeamName } from './parts';

const L = ipg.log;

interface Turn {
  team: Team;
  clue: LogEntry | null;
  rest: LogEntry[];
}

/** The log as turns: each clue opens one; anything before the first clue stands alone. */
function turns(log: readonly LogEntry[]): Turn[] {
  const out: Turn[] = [];
  for (const e of log) {
    if (e.type === 'clue') out.push({ team: e.team, clue: e, rest: [] });
    else if (out.length) out[out.length - 1].rest.push(e);
    else out.push({ team: e.team, clue: null, rest: [e] });
  }
  return out;
}

const Glyph = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <span
    aria-hidden
    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-13 ${className}`}
  >
    {children}
  </span>
);

function Line({ e }: { e: LogEntry }) {
  const word = e.word ?? '';
  switch (e.type) {
    case 'guess':
    case 'penalty': {
      const id = e.identity ?? 'blank';
      return (
        <>
          <Glyph className={CARD_FACE[id]}>
            <Mark id={id} className="h-3 w-3" />
          </Glyph>
          <span className="min-w-0 flex-1">
            {e.type === 'guess' ? L.guess(word) : L.penalty(e.team, word)}
            <span className="text-[var(--tx2)]"> · {ipg.identity[id]}</span>
          </span>
        </>
      );
    }
    case 'end':
    case 'timeout':
      return (
        <>
          <Glyph className="bg-ov/[.08] text-[var(--tx2)]">{Icon.check}</Glyph>
          <span className="min-w-0 flex-1 text-[var(--tx2)]">
            {e.type === 'end' ? L.end : L.timeout}
          </span>
        </>
      );
    case 'undo':
      return (
        <>
          <Glyph className="bg-ov/[.08] text-[var(--tx2)]">{Icon.undo}</Glyph>
          <span className="min-w-0 flex-1 text-[var(--tx2)]">{L.undo(word)}</span>
        </>
      );
    case 'not-allowed':
      return (
        <>
          <Glyph className="bg-ov/[.08] text-[var(--danger)]">{Icon.warn}</Glyph>
          <span className="min-w-0 flex-1 font-bold">{L.notAllowed(e.team)}</span>
        </>
      );
    case 'skip':
      return (
        <>
          <Glyph className="bg-ov/[.08] text-[var(--tx2)]">{Icon.arrow}</Glyph>
          <span className="min-w-0 flex-1 text-[var(--tx2)]">{L.skip(e.team)}</span>
        </>
      );
    default:
      return null;
  }
}

/** Every clue and pick of a game, turn by turn. Shared with the Win screen. */
export function ClueLog({ game }: { game: Pick<IshaaraPublic, 'log' | 'players'> }) {
  const ts = turns(game.log);
  if (!ts.length) return <p className="text-16 text-[var(--tx2)]">{L.empty}</p>;
  return (
    <ol aria-label={L.label} className="flex flex-col gap-2">
      {ts.map((t, i) => {
        const giver = clueGiverOf(game, t.team);
        return (
          <li key={i} className="glass px-4 py-3">
            {t.clue && (
              <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-13 font-bold uppercase tracking-[0.08em]">
                  <TeamName team={t.team}>{L.turn(t.team)}</TeamName>
                </span>
                {giver && <span className="text-13 text-[var(--tx2)]">{L.clueBy(giver.name)}</span>}
                <span className="disp w-full text-20 font-extrabold tracking-[-0.01em] [overflow-wrap:anywhere]">
                  {L.clue(t.clue.word ?? null, t.clue.number ?? 0)}
                </span>
              </div>
            )}
            {t.rest.length > 0 && (
              <ul className="flex flex-col gap-1.5 text-15">
                {t.rest.map((e, j) => (
                  <li key={j} className="flex min-h-7 items-center gap-2.5">
                    <Line e={e} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
