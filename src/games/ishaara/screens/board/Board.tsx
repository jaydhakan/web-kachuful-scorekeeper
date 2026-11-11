import type { IshaaraTable } from '@/games/ishaara/state/useTable';
import { table as s } from '@/games/ishaara/strings/table';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { BoardNote, BoardOverlays, Reconnecting, SendError, TurnActions } from './BoardParts';
import { ClueCard, GuessesLeft, TurnBanner, TurnTimer, WordsLeft } from './TurnPanel';
import { useBoard } from './useBoard';
import { WordGrid } from './WordGrid';

export { diffReveal, MOMENT_MS } from './useBoard';

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
  const { game, live, active, serverNow } = v;
  if (!game) return null;

  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-[max(1rem,var(--sab))] pl-[max(1rem,var(--sal))] pr-[max(1rem,var(--sar))] pt-[calc(var(--sat)+0.75rem)]">
      <div className="mx-auto grid h-full min-h-[38rem] max-w-[40rem] grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 pane:min-h-0 pane:max-w-none pane:grid-cols-[minmax(15rem,22rem)_minmax(0,1fr)] pane:grid-rows-1 pane:gap-4">
        {/* One column on an upright phone (header, grid, actions); the side panel beside the grid when wide. */}
        <div className="contents pane:col-start-1 pane:row-start-1 pane:flex pane:min-h-0 pane:flex-col pane:gap-3 pane:overflow-y-auto pane:overscroll-contain">
          <header className="order-1 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <IconButton chrome label={b.menu} onClick={() => v.setMenu(true)}>
                {Icon.menu}
              </IconButton>
              <TurnBanner game={game} />
              <span className="flex min-w-12 justify-end">
                <TurnTimer deadline={active ? game.deadline : null} serverNow={serverNow} />
              </span>
            </div>
            <ClueCard game={game} />
            <div className="hidden pane:block">
              <GuessesLeft game={game} />
            </div>
            <WordsLeft game={game} />
          </header>
          <footer className="order-3 flex flex-col gap-3 pane:mt-auto">
            <BoardNote v={v} />
            <SendError v={v} />
            <TurnActions v={v} />
          </footer>
        </div>

        <main
          aria-busy={!live || undefined}
          className={`relative order-2 min-h-[17rem] pane:col-start-2 pane:row-start-1 pane:min-h-0 ${live ? '' : 'opacity-60'}`}
        >
          <WordGrid
            words={game.words}
            revealed={game.revealed}
            disabled={!v.canPick}
            selected={v.selected}
            lit={v.moment?.card ?? null}
            onPick={v.setSelected}
          />
        </main>
      </div>

      <Reconnecting v={v} />
      <BoardOverlays v={v} onRules={onRules} onLeave={onLeave} />
    </div>
  );
}
