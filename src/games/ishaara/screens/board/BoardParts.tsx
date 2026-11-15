import { AnimatePresence } from 'framer-motion';
import { clueGiverOf, SKIP_AFTER_MS, wordsOf } from '@/games/ishaara/domain';
import { table as s } from '@/games/ishaara/strings/table';
import { Icon } from '@/components/ui/Icons';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { BoardMenu } from './BoardMenu';
import { ConfirmBar, EndNote, MomentNote, NoticeNote, PenaltyNote } from './Notes';
import type { BoardView } from './useBoard';

const b = s.board;

/**
 * The one note under the turn: a reveal moment, a turn notice, the penalty wait, or Confirm for the picked card.
 * It sits in a slot of fixed height, anchored at its foot, so the grid above never changes size when a note comes
 * or goes; a taller note (the penalty wait, while picks are off) rises over the board instead.
 */
export function BoardNote({ v, compact }: { v: BoardView; compact?: boolean }) {
  const { game, moment, notice, pending, picker, selected, canSend, finished, serverNow } = v;
  if (!game) return null;
  let note;
  if (finished) note = null;
  else if (moment && selected === null) note = <MomentNote key={`m${moment.card}`} mo={moment} />;
  else if (pending && picker)
    note = (
      <PenaltyNote
        key="penalty"
        name={clueGiverOf(game, picker)?.name ?? s.team[picker]}
        picker={picker}
        skipIn={pending.since + SKIP_AFTER_MS - serverNow}
        canSend={canSend}
        onSkip={() => void v.act({ type: 'skip' })}
      />
    );
  else if (selected !== null)
    note = (
      <ConfirmBar
        key="confirm"
        word={game.words[selected]}
        canSend={canSend}
        compact={compact}
        onCancel={() => v.setSelected(null)}
        onConfirm={() => void v.confirm()}
      />
    );
  else if (notice) note = <NoticeNote key={`n${notice.kind}`} n={notice} next={game.turn} />;
  return (
    <div data-note-slot className={`relative shrink-0 ${compact ? 'h-[8.5rem]' : 'h-[4.75rem]'}`}>
      <div className="absolute inset-x-0 bottom-0 z-10">
        <AnimatePresence mode="popLayout" initial={false}>
          {note}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** The last card's moment, over the grid: the trap waits for "See the result", a found-all win holds a while. */
export function BoardEnd({ v }: { v: BoardView }) {
  const { game, moment, endedOnCard } = v;
  if (!game || !endedOnCard || !moment) return null;
  const winner = game.winner;
  return (
    <EndNote
      mo={moment}
      winner={winner}
      found={winner ? wordsOf(game, winner) : 0}
      // Away from the card: a card in the lower rows puts the note at the top.
      top={moment.card >= 10}
      onDone={v.onFinished}
    />
  );
}

/** The refusal of the last action, said once. */
export function SendError({ v }: { v: BoardView }) {
  if (!v.error) return null;
  return (
    <p role="alert" className="text-15 font-medium text-[var(--warn)]">
      {v.error}
    </p>
  );
}

/** Undo (while its window is open) and End turn, once the clue is in. */
export function TurnActions({ v, className = '' }: { v: BoardView; className?: string }) {
  const { game, active, pending, undo, canSend, endDisabled } = v;
  if (!game || !active) return null;
  // The row keeps its height while the game is live (no clue yet, a penalty pending), so the grid never jumps.
  // A mis-tap that ended the turn leaves no clue, which is when Undo matters most.
  if (pending || (!game.clue && !undo)) return <div aria-hidden className={`h-14 ${className}`} />;
  const endId = 'ish-end-why';
  return (
    <div className={`flex gap-2 ${className}`}>
      {undo && (
        <PrimaryButton
          tone="glass"
          onClick={() => void v.act({ type: 'undoLast' })}
          disabled={!canSend}
          aria-label={b.undo(game.words[undo.card].toUpperCase())}
          className="!h-14 shrink-0 px-4 !text-16"
        >
          <span aria-hidden className="[&_svg]:h-5 [&_svg]:w-5">
            {Icon.undo}
          </span>
          {b.undoShort}
        </PrimaryButton>
      )}
      {game.clue && (
        <>
          <PrimaryButton
            tone="glass"
            onClick={() => void v.act({ type: 'endTurn' })}
            disabled={endDisabled}
            aria-describedby={game.guessedThisTurn < 1 ? endId : undefined}
            className="!h-14 min-w-0 flex-1 !text-17 dt:!text-22"
          >
            {b.endTurn(game.turn)}
          </PrimaryButton>
          <span id={endId} className="sr-only">
            {b.endTurnWhy}
          </span>
        </>
      )}
    </div>
  );
}

/** Over the board while the link is down: picks are paused, never queued. */
export function Reconnecting({ v }: { v: BoardView }) {
  if (v.live) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-x-4 top-1/2 z-30 mx-auto flex max-w-[30rem] -translate-y-1/2 items-center gap-4 rounded-[24px] bg-[var(--sheet-bg)] p-5 shadow-xl"
    >
      <span
        aria-hidden
        className="h-9 w-9 shrink-0 animate-spin rounded-full border-[3px] border-ov/20 border-t-[var(--accent)] motion-reduce:animate-none"
      />
      <span>
        <span className="block text-19 font-bold">
          {v.conn === 'offline' ? b.offline : b.reconnecting}
        </span>
        <span className="text-15 text-[var(--tx2)]">{b.paused}</span>
      </span>
    </div>
  );
}

/** What changed, for screen readers; the menu and the resign question. */
export function BoardOverlays({
  v,
  onRules,
  onLeave,
}: {
  v: BoardView;
  onRules: () => void;
  onLeave: () => void;
}) {
  const { menu, resign, setMenu, setResign } = v;
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {v.said}
      </p>
      <AnimatePresence>
        {menu && (
          <BoardMenu
            key="menu"
            canResign={v.active && v.canSend}
            gameId={v.game?.id}
            host={v.host}
            timed={v.active && v.game?.deadline != null}
            onClose={() => setMenu(false)}
            onRules={() => (setMenu(false), onRules())}
            onLeave={() => (setMenu(false), onLeave())}
            onResign={(t) => (setMenu(false), setResign(t))}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {resign && (
          <Modal
            key="resign"
            text={b.resignAsk(resign)}
            ok={b.resignOk}
            danger
            onCancel={() => setResign(null)}
            onOk={() => {
              const t = resign;
              setResign(null);
              void v.act({ type: 'resign', team: t });
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
