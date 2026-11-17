import type { IshaaraTable } from '@/games/ishaara/state/useTable';
import { table as s } from '@/games/ishaara/strings/table';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import {
  BoardEnd,
  BoardNote,
  BoardOverlays,
  Reconnecting,
  SendError,
  TurnActions,
} from './BoardParts';
import {
  ClueCard,
  GuessesLeft,
  TimerBar,
  TurnBanner,
  TurnSweep,
  TurnTimer,
  WordsLeft,
} from './TurnPanel';
import { useBoard, type BoardView } from './useBoard';
import { WordGrid } from './WordGrid';

export { diffReveal, MOMENT_MS, WIN_HOLD_MS } from './useBoard';

/** What the grid shows and how, shared by the phone and the desk boards. */
export function gridProps(v: BoardView) {
  const g = v.game!;
  const end = v.finished && g.solution;
  return {
    words: g.words,
    // At the end the whole key turns over, in a wave from the cards that were still face down.
    revealed: end ? g.solution! : g.revealed,
    waveFrom: end ? g.revealed : null,
    disabled: !v.canPick,
    dim: v.active && v.live && !v.canPick,
    selected: v.selected,
    lit: v.moment?.card ?? null,
    verdict: v.moment?.kind ?? null,
    meld: v.meld,
    onPick: v.setSelected,
    onBlocked: v.blocked,
  };
}

/** The pulse on a team's count when it finds one of its own. */
export const countPulse = (v: BoardView) =>
  v.moment?.kind === 'own' ? { team: v.moment.team, key: v.moment.card } : null;

/** The whole turn in ms on a timed game, for the timer bar. */
export const turnMs = (v: BoardView) =>
  v.game?.rules.timerSec ? v.game.rules.timerSec * 1000 : null;

const b = s.board;

/** What the table's board and the desk board both take. */
export interface BoardProps {
  table: IshaaraTable;
  onLeave: () => void;
  onRules: () => void;
  /** The game ended on this board; called after its moment (or a tap), to move on to the result. */
  onFinished: () => void;
}

/**
 * The table's board: the turn, the clue, the 25 words as buttons, Confirm, End turn, Undo, the reveal moments, the
 * penalty wait and the reconnecting state. Picks are never queued: while the link isn't live they are off.
 */
export function Board({ table, onLeave, onRules, onFinished }: BoardProps) {
  const v = useBoard(table, onFinished);
  const { game, live, active, clockOffset } = v;
  if (!game) return null;

  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-[max(1rem,var(--sab))] pl-[max(1rem,var(--sal))] pr-[max(1rem,var(--sar))] pt-[calc(var(--sat)+0.75rem)]">
      {/* No minimum height: on a short phone the grid takes what is left, and the note slot never borrows from it. */}
      <div className="mx-auto grid h-full max-w-[40rem] grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-2.5 tall:gap-3 pane:max-w-none pane:grid-cols-[minmax(15rem,22rem)_minmax(0,1fr)] pane:grid-rows-1 pane:gap-4">
        {/* One column on an upright phone (header, grid, actions); the side panel beside the grid when wide. */}
        <div className="contents pane:col-start-1 pane:row-start-1 pane:flex pane:min-h-0 pane:flex-col pane:gap-2.5 pane:overflow-y-auto pane:overscroll-contain">
          <header className="order-1 flex flex-col gap-2.5 tall:gap-3">
            <div className="flex items-center justify-between gap-2">
              <IconButton chrome label={b.menu} onClick={() => v.setMenu(true)}>
                {Icon.menu}
              </IconButton>
              <TurnBanner game={game} />
              <span className="flex min-w-12 justify-end">
                <TurnTimer deadline={active ? game.deadline : null} offset={clockOffset} />
              </span>
            </div>
            <TimerBar
              deadline={active ? game.deadline : null}
              totalMs={turnMs(v)}
              offset={clockOffset}
            />
            <ClueCard game={game} nudge={v.nudge} />
            {/* A phone on its side keeps the count in the clue card, to leave room for End turn. */}
            <div className="hidden wide:block">
              <GuessesLeft game={game} />
            </div>
            <WordsLeft game={game} pulse={countPulse(v)} />
          </header>
          <footer className="order-3 flex flex-col gap-2.5 tall:gap-3 pane:mt-auto">
            <BoardNote v={v} />
            <SendError v={v} />
            <TurnActions v={v} />
          </footer>
        </div>

        <main
          aria-busy={!live || undefined}
          className={`relative order-2 min-h-0 pane:col-start-2 pane:row-start-1 ${live ? '' : 'opacity-60'}`}
        >
          <WordGrid {...gridProps(v)} />
          <BoardEnd v={v} />
        </main>
      </div>

      <TurnSweep handoff={v.handoff} />
      <Reconnecting v={v} />
      <BoardOverlays v={v} onRules={onRules} onLeave={onLeave} />
    </div>
  );
}
