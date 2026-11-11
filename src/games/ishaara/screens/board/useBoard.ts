import { useEffect, useRef, useState } from 'react';
import {
  clueGiverOf,
  other,
  type Action,
  type IshaaraPublic,
  type Team,
} from '@/games/ishaara/domain';
import type { SendResult } from '@/games/ishaara/state/link';
import { useAutoTimeout, type IshaaraTable } from '@/games/ishaara/state/useTable';
import { table as s } from '@/games/ishaara/strings/table';
import { useWakeLock } from '@/hooks/useWakeLock';
import { momentText, type Moment } from './Notes';
import { useServerNow } from './useServerNow';

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
 * Everything the table's board knows besides its layout: the selection, the reveal moments, what to announce, the
 * undo window, the penalty wait and sending. The phone board and the desk board both read it.
 */
export function useBoard(table: IshaaraTable, onFinished: () => void) {
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

  const live = conn === 'live';
  const canSend = live && !busy;
  const canPick = !!game && active && !!game.clue && !game.pending && canSend;
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
  const undo = game?.undo && serverNow < game.undo.until && active ? game.undo : null;
  const pending = game?.pending ?? null;
  const picker = pending ? other(pending.penaltyFor) : null;
  const endDisabled = !canSend || !game || game.guessedThisTurn < 1;

  return {
    game,
    conn,
    live,
    canSend,
    canPick,
    active,
    finished,
    serverNow,
    selected,
    setSelected,
    moment,
    said,
    error,
    menu,
    setMenu,
    resign,
    setResign,
    act,
    confirm,
    undo,
    pending,
    picker,
    endDisabled,
    onFinished,
  };
}

export type BoardView = ReturnType<typeof useBoard>;
