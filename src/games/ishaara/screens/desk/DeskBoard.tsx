import { useIsPresent } from 'framer-motion';
import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { BoardProps } from '@/games/ishaara/screens/board/Board';
import {
  BoardNote,
  BoardOverlays,
  Reconnecting,
  SendError,
  TurnActions,
} from '@/games/ishaara/screens/board/BoardParts';
import {
  ClueCard,
  GuessesLeft,
  TurnBanner,
  TurnTimer,
  WordsLeft,
} from '@/games/ishaara/screens/board/TurnPanel';
import { useBoard } from '@/games/ishaara/screens/board/useBoard';
import { WordGrid } from '@/games/ishaara/screens/board/WordGrid';
import { ishDesk as d } from '@/games/ishaara/strings/desk';
import { table as s } from '@/games/ishaara/strings/table';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { KeyHints } from '@/components/desk/DeskParts';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';

const CONTROL = 'button,a[href],input,textarea,select,[contenteditable],[role="button"]';

/**
 * The board on a tablet or desktop: the 5 × 5 grid fills the screen beside a side panel (above it on an upright
 * tablet). Arrows move across the grid, Enter picks a card and Enter again guesses it, Escape lets go.
 */
export default function DeskBoard({ table, onLeave, onRules, onFinished }: BoardProps) {
  const v = useBoard(table, onFinished);
  const { game, live, active, serverNow, selected, setSelected } = v;
  const roving = useRovingFocus({ selected: selected ?? -1, orientation: 'grid', columns: 5 });
  // Keys stop while the menu or the resign question is up, and while the board animates out.
  const present = useIsPresent();
  const keys = present && !v.menu && !v.resign;
  const picked = selected !== null;
  const confirm = v.confirm;
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!keys || !picked) return;
    // Enter on a control or in a field stays with it; on the page it guesses the picked card.
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      // A hub page over the board leaves it inert.
      if (root.current?.closest('[inert]')) return;
      if (e.key === 'Escape') setSelected(null);
      else if (e.key === 'Enter' && !(e.target as Element).closest?.(CONTROL)) void confirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys, picked, setSelected, confirm]);
  if (!game) return null;

  // Enter on the card already picked guesses it; on any other card the button picks it as usual.
  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    roving.group.onKeyDown(e);
    const cell = (e.target as HTMLElement).closest('[data-roving]');
    if (e.key !== 'Enter' || !cell || !picked) return;
    const i = [...e.currentTarget.querySelectorAll('[data-roving]')].indexOf(cell);
    if (i === selected) {
      e.preventDefault();
      void v.confirm();
    }
  };

  return (
    <div
      ref={root}
      className="absolute inset-0 overflow-hidden pb-[max(1.5rem,var(--sab))] pl-[max(1.5rem,var(--sal))] pr-[max(1.5rem,var(--sar))] pt-[calc(var(--sat)+1.5rem)]"
    >
      <div className="mx-auto grid h-full max-w-[100rem] grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-5 rail:grid-cols-[minmax(19rem,24rem)_minmax(0,1fr)] rail:grid-rows-1 rail:gap-6">
        <aside
          aria-label={d.panel}
          className="grid grid-cols-2 gap-x-6 gap-y-4 rail:flex rail:min-h-0 rail:flex-col rail:overflow-y-auto rail:overscroll-contain"
        >
          <header className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <IconButton chrome label={s.board.menu} onClick={() => v.setMenu(true)}>
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
            <WordsLeft game={game} column />
          </header>
          <footer className="flex flex-col justify-end gap-3 rail:mt-auto">
            <BoardNote v={v} compact />
            <SendError v={v} />
            <TurnActions v={v} />
            <KeyHints
              items={[
                [d.keys.arrows, d.hints.move],
                [d.keys.enter, d.hints.pick],
                [d.keys.esc, d.hints.cancel],
              ]}
            />
          </footer>
        </aside>

        <main
          aria-busy={!live || undefined}
          className={`relative min-h-0 min-w-0 ${live ? '' : 'opacity-60'}`}
        >
          <div
            role="group"
            aria-label={d.grid}
            {...{ ...roving.group, onKeyDown: onGridKey }}
            className="h-full"
          >
            <WordGrid
              words={game.words}
              revealed={game.revealed}
              disabled={!v.canPick}
              selected={selected}
              lit={v.moment?.card ?? null}
              onPick={setSelected}
              cellProps={roving.item}
            />
          </div>
        </main>
      </div>

      <Reconnecting v={v} />
      <BoardOverlays v={v} onRules={onRules} onLeave={onLeave} />
    </div>
  );
}
