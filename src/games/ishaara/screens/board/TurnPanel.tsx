import { clueGiverOf, wordsLeft, type IshaaraPublic, type Team } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';
import { Icon } from '@/components/ui/Icons';
import { TeamCount, TeamPill } from './marks';

const b = s.board;

/** Whose turn it is: the team's colour, shape and name. */
export function TurnBanner({ game }: { game: IshaaraPublic }) {
  return <TeamPill team={game.turn} label={b.turn(game.turn)} className="justify-center" />;
}

/** The turn's countdown from the server's deadline; nothing while the timer is off or the clue isn't in. */
export function TurnTimer({ deadline, serverNow }: { deadline: number | null; serverNow: number }) {
  if (deadline === null) return null;
  const left = deadline - serverNow;
  const txt = s.clock(left);
  return (
    <span
      role="timer"
      aria-label={b.timeLeft(txt)}
      className={`glass inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-17 font-bold tabular-nums ${left <= 10_000 ? 'text-[var(--warn)]' : ''}`}
    >
      <span aria-hidden className="[&_svg]:h-5 [&_svg]:w-5">
        {Icon.history}
      </span>
      <span aria-hidden>{txt}</span>
    </span>
  );
}

/** The clue and its number ("Spice 2"), "Clue given · 2" in spoken mode, or who the table is waiting on. */
export function ClueCard({ game }: { game: IshaaraPublic }) {
  const giver = clueGiverOf(game, game.turn)?.name ?? s.team[game.turn];
  const c = game.clue;
  const left =
    c === null ? null : game.guessesLeft === 'inf' ? b.noLimit : String(game.guessesLeft);
  return (
    <section
      aria-label={b.cluesBy(giver)}
      className="glass flex items-center gap-3 px-5 py-4 land:px-4 land:py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="mono-label text-13 text-[var(--accent-tx)]">{b.cluesBy(giver)}</p>
        {c ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="disp text-36 font-extrabold leading-none tracking-[-0.03em] [overflow-wrap:anywhere] land:text-28">
              {c.word ?? b.clueGiven}
            </span>
            <span className="inline-grid min-h-11 min-w-11 place-items-center rounded-xl bg-ov px-2 text-28 font-extrabold text-[var(--bg)]">
              {s.num(c.number)}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-19 font-semibold text-[var(--tx2)]">{b.waitingClue(giver)}</p>
        )}
      </div>
      {left !== null && (
        <p className="shrink-0 text-right pane:hidden">
          <span className="block text-36 font-extrabold leading-none">{left}</span>
          <span className="text-15 text-[var(--tx2)]">{b.guessesLeft}</span>
        </p>
      )}
    </section>
  );
}

/** "2 guesses left" as a line, for the side panel. */
export function GuessesLeft({ game }: { game: IshaaraPublic }) {
  if (!game.clue) return null;
  const left = game.guessesLeft === 'inf' ? b.noLimit : String(game.guessesLeft);
  return (
    <p className="text-17 text-[var(--tx2)]">
      <span className="font-bold text-[var(--tx)]">{left}</span> {b.guessesLeft}
    </p>
  );
}

/** Words still face down per team. */
export function WordsLeft({ game, column }: { game: IshaaraPublic; column?: boolean }) {
  const teams: Team[] = ['sun', 'moon'];
  return (
    <ul className={`flex gap-2 ${column ? 'flex-col' : 'flex-wrap'}`}>
      {teams.map((t) => (
        <li key={t} className={column ? '' : 'glass rounded-full px-4 py-2'}>
          <TeamCount team={t} n={wordsLeft(game, t)} className="text-17" />
        </li>
      ))}
    </ul>
  );
}
