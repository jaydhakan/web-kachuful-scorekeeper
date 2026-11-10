import { AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  clueGiverOf,
  other,
  SKIP_AFTER_MS,
  type Action,
  type IshaaraPublic,
  type Team,
} from '@/games/ishaara/domain';
import type { SendResult } from '@/games/ishaara/state/link';
import { useAutoTimeout, type IshaaraTable } from '@/games/ishaara/state/useTable';
import { table as s } from '@/games/ishaara/strings/table';
import { useWakeLock } from '@/hooks/useWakeLock';
import { IconButton } from '@/components/ui/IconButton';
import { Icon } from '@/components/ui/Icons';
import { Modal } from '@/components/ui/Modal';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { BoardMenu } from './BoardMenu';
import { ConfirmBar, MomentNote, PenaltyNote, momentText, type Moment } from './Notes';
import { ClueCard, GuessesLeft, TurnBanner, TurnTimer, WordsLeft } from './TurnPanel';
import { useServerNow } from './useServerNow';
import { WordGrid } from './WordGrid';

const b = s.board;
/** How long a reveal moment stays before the board settles (the trap holds until the win screen). */
export const MOMENT_MS = 2400;

/** What one new state turned over since the last: a guess, a penalty word, or an undo. */
export function diffReveal(
  prev: IshaaraPublic,
  next: IshaaraPublic,
): { moment: Moment } | { undone: string } | null {
  for (let i = 0; i < next.revealed.length; i++) {
    const was = prev.revealed[i],
      now = next.revealed[i];
    if (was !== null && now === null) return { undone: next.words[i] };
    if (was === null && now !== null) {
      const entry = [...next.log].reverse().find((e) => e.card === i);
      const word = next.words[i];
      if (entry?.type === 'penalty')
        return { moment: { kind: 'penalty', card: i, word, team: now as Team, id: now } };
      const by = entry?.team ?? prev.turn;
      const kind =
        now === 'trap' ? 'trap' : now === 'blank' ? 'blank' : now === by ? 'own' : 'other';
      return { moment: { kind, card: i, word, team: by, id: now } };
    }
  }
  return null;
}

function refusedText(r: Extract<SendResult, { ok: false }>): string {
  if ('refused' in r) return r.refused === 'busy' ? b.refused.busy : b.refused.offline;
  if (r.error.offline) return b.refused.offline;
  return r.error.status === 409 ? b.refused.stale : b.refused.generic;
}

/**
 * The table's board: the turn, the clue, the 25 words as buttons, Confirm, End turn, Undo, the reveal moments, the
 * penalty wait and the reconnecting state. Picks are never queued: while the link isn't live they are off.
 */
export function Board({
  table,
  onLeave,
  onRules,
  onFinished,
}: {
  table: IshaaraTable;
  onLeave: () => void;
  onRules: () => void;
  /** The game ended on this board; called after its moment (or a tap), to move on to the result. */
  onFinished: () => void;
}) {
  const { game, conn, busy, clockOffset, send } = table;
  const [selected, setSelected] = useState<number | null>(null);
  const [moment, setMoment] = useState<Moment | null>(null);
  const [said, setSaid] = useState('');
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const [resign, setResign] = useState<Team | null>(null);
  const prev = useRef<IshaaraPublic | null>(null);
  const active = game?.status === 'active';
  useWakeLock(!!game && game.status !== 'finished');
  useAutoTimeout(table, active);
  const ticking = !!game && (game.deadline !== null || !!game.pending || !!game.undo);
  const serverNow = useServerNow(clockOffset, ticking);

  // Each new state: what turned, what to say, and whether the selection still stands.
  useEffect(() => {
    const p = prev.current;
    prev.current = game;
    if (!game || !p || game.rev === p.rev) return;
    const d = diffReveal(p, game);
    if (d && 'moment' in d) {
      setMoment(d.moment);
      setSaid(momentText(d.moment));
    } else if (d) setSaid(b.announce.undone(d.undone.toUpperCase()));
    if (game.turn !== p.turn && !game.clue && game.status === 'active') {
      const giver = clueGiverOf(game, game.turn)?.name ?? s.team[game.turn];
      setSaid((x) =>
        d ? `${x} ${b.announce.turn(game.turn, giver)}` : b.announce.turn(game.turn, giver),
      );
    } else if (game.clue && (!p.clue || p.clue.team !== game.clue.team || p.turn !== game.turn)) {
      const giver = clueGiverOf(game, game.clue.team)?.name ?? s.team[game.clue.team];
      setSaid(b.announce.clue(giver, game.clue.word, game.clue.number));
    }
    setSelected((sel) =>
      sel !== null && (game.revealed[sel] !== null || !game.clue || game.pending) ? null : sel,
    );
  }, [game]);

  // A moment fades after a while; the trap's stays and hands over to the result.
  const finished = game?.status === 'finished';
  useEffect(() => {
    if (finished) {
      const id = setTimeout(onFinished, moment ? MOMENT_MS : 0);
      return () => clearTimeout(id);
    }
    if (!moment) return;
    const id = setTimeout(() => setMoment(null), MOMENT_MS);
    return () => clearTimeout(id);
  }, [moment, finished, onFinished]);

  if (!game) return null;
  const live = conn === 'live';
  const canSend = live && !busy;
  const canPick = active && !!game.clue && !game.pending && canSend;
  const act = async (a: Action) => {
    setError('');
    const r = await send(a);
    if (!r.ok) setError(refusedText(r));
    return r.ok;
  };
  const confirm = async () => {
    if (selected === null) return;
    const card = selected;
    setSelected(null);
    await act({ type: 'guess', card });
  };
  const undo = game.undo && serverNow < game.undo.until && active ? game.undo : null;
  const pending = game.pending;
  const picker = pending ? other(pending.penaltyFor) : null;
  const endDisabled = !canSend || game.guessedThisTurn < 1;

  let note;
  if (moment && (moment.kind === 'trap' || selected === null))
    note = (
      <MomentNote key={`m${moment.card}`} mo={moment} onDone={finished ? onFinished : undefined} />
    );
  else if (pending && picker)
    note = (
      <PenaltyNote
        key="penalty"
        name={clueGiverOf(game, picker)?.name ?? s.team[picker]}
        picker={picker}
        skipIn={pending.since + SKIP_AFTER_MS - serverNow}
        canSend={canSend}
        onSkip={() => void act({ type: 'skip' })}
      />
    );
  else if (selected !== null)
    note = (
      <ConfirmBar
        key="confirm"
        word={game.words[selected]}
        canSend={canSend}
        onCancel={() => setSelected(null)}
        onConfirm={() => void confirm()}
      />
    );

  const endId = 'ish-end-why';
  return (
    <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-[max(1rem,var(--sab))] pl-[max(1rem,var(--sal))] pr-[max(1rem,var(--sar))] pt-[calc(var(--sat)+0.75rem)]">
      <div className="mx-auto grid h-full min-h-[38rem] max-w-[40rem] grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 pane:min-h-0 pane:max-w-none pane:grid-cols-[minmax(15rem,22rem)_minmax(0,1fr)] pane:grid-rows-1 pane:gap-4">
        {/* One column on an upright phone (header, grid, actions); the side panel beside the grid when wide. */}
        <div className="contents pane:col-start-1 pane:row-start-1 pane:flex pane:min-h-0 pane:flex-col pane:gap-3 pane:overflow-y-auto pane:overscroll-contain">
          <header className="order-1 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <IconButton chrome label={b.menu} onClick={() => setMenu(true)}>
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
            <AnimatePresence mode="popLayout" initial={false}>
              {note}
            </AnimatePresence>
            {error && (
              <p role="alert" className="text-15 font-medium text-[var(--warn)]">
                {error}
              </p>
            )}
            {active && !pending && game.clue && (
              <div className="flex flex-wrap gap-2">
                {undo && (
                  <PrimaryButton
                    tone="glass"
                    onClick={() => void act({ type: 'undoLast' })}
                    disabled={!canSend}
                    className="!h-14 px-4 !text-16"
                  >
                    <span aria-hidden className="[&_svg]:h-5 [&_svg]:w-5">
                      {Icon.undo}
                    </span>
                    {b.undo(game.words[undo.card].toUpperCase())}
                  </PrimaryButton>
                )}
                <PrimaryButton
                  tone="glass"
                  onClick={() => void act({ type: 'endTurn' })}
                  disabled={endDisabled}
                  aria-describedby={game.guessedThisTurn < 1 ? endId : undefined}
                  className="!h-14 min-w-[10rem] flex-1 !text-17"
                >
                  {b.endTurn(game.turn)}
                </PrimaryButton>
                <span id={endId} className="sr-only">
                  {b.endTurnWhy}
                </span>
              </div>
            )}
          </footer>
        </div>

        <main
          aria-busy={!live || undefined}
          className={`relative order-2 min-h-[17rem] pane:col-start-2 pane:row-start-1 pane:min-h-0 ${live ? '' : 'opacity-60'}`}
        >
          <WordGrid
            words={game.words}
            revealed={game.revealed}
            disabled={!canPick}
            selected={selected}
            lit={moment?.card ?? null}
            onPick={setSelected}
          />
        </main>
      </div>

      {!live && (
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
              {conn === 'offline' ? b.offline : b.reconnecting}
            </span>
            <span className="text-15 text-[var(--tx2)]">{b.paused}</span>
          </span>
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {said}
      </p>

      <AnimatePresence>
        {menu && (
          <BoardMenu
            key="menu"
            canResign={active && canSend}
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
              void act({ type: 'resign', team: t });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
