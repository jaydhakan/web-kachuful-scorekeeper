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
/** How long a reveal moment or a turn notice stays before the board settles. */
export const MOMENT_MS = 2400;
/** An all-found win holds this long on the board (or until a tap); a trap waits for "See the result". */
export const WIN_HOLD_MS = 4000;

/** A turn that ended without a card: time ran out, End turn, an undo, or a skipped penalty. */
export type Notice = { kind: 'timeout' | 'end' | 'undo' | 'skip'; team: Team; word?: string };
/** A new turn, numbered so the handoff plays again for the same team (after a skip, say). */
export type Handoff = { team: Team; n: number; why: Notice['kind'] | null };

/** The turn notice in one new state, from the log entry it added. */
export function noticeOf(prev: IshaaraPublic, next: IshaaraPublic): Notice | null {
  if (next.log.length <= prev.log.length) return null;
  const e = next.log.at(-1)!;
  if (e.type === 'timeout' || e.type === 'end' || e.type === 'skip' || e.type === 'undo')
    return { kind: e.type, team: e.team, word: e.word };
  return null;
}

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
  const [notice, setNotice] = useState<Notice | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  // Bumped by a tap on an inert board, so the clue card can say why.
  const [nudge, setNudge] = useState(0);
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
    const n = noticeOf(p, game);
    if (n && n.kind !== 'undo') setNotice(n);
    else if (d && 'undone' in d) setNotice({ kind: 'undo', team: game.turn, word: d.undone });
    if (game.turn !== p.turn && game.status === 'active')
      setHandoff((h) => ({ team: game.turn, n: (h?.n ?? 0) + 1, why: n?.kind ?? null }));
    if (game.turn !== p.turn && !game.clue && game.status === 'active') {
      const giver = clueGiverOf(game, game.turn)?.name ?? s.team[game.turn];
      const turn = b.announce.turn(game.turn, giver);
      const lead = n?.kind === 'timeout' ? `${b.notice.timeout} ` : '';
      setSaid((x) => (d ? `${x} ${lead}${turn}` : `${lead}${turn}`));
    } else if (game.clue && (!p.clue || p.clue.team !== game.clue.team || p.turn !== game.turn)) {
      const giver = clueGiverOf(game, game.clue.team)?.name ?? s.team[game.clue.team];
      setSaid(b.announce.clue(giver, game.clue.word, game.clue.number));
    }
    setSelected((sel) =>
      sel !== null && (game.revealed[sel] !== null || !game.clue || game.pending) ? null : sel,
    );
  }, [game]);

  // A moment fades after a while. At the end a trap waits for "See the result", a found-all win holds a few
  // seconds over the turned key, and a resignation moves on at once.
  const finished = game?.status === 'finished';
  // Only a game that ended on a card holds on the board; a resignation (or the idle end) goes straight on.
  const endedOnCard =
    finished && !!moment && (game.endedBy === 'trap' || game.endedBy === 'all-found');
  useEffect(() => {
    if (finished) {
      if (endedOnCard && moment?.kind === 'trap') return;
      const id = setTimeout(onFinished, endedOnCard ? WIN_HOLD_MS : 0);
      return () => clearTimeout(id);
    }
    if (!moment) return;
    const id = setTimeout(() => setMoment(null), MOMENT_MS);
    return () => clearTimeout(id);
  }, [moment, finished, endedOnCard, onFinished]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), MOMENT_MS);
    return () => clearTimeout(id);
  }, [notice]);

  const live = conn === 'live';
  const canSend = live && !busy;
  const canPick = !!game && active && !!game.clue && !game.pending && canSend;
  const act = async (a: Action) => {
    setError('');
    const r = await send(a);
    if (!r.ok) setError(refusedText(r));
    return r.ok;
  };
  // A tap on a board that can't take one: say why, and let the clue card show it.
  const blocked = () => {
    if (!game || !active || canPick || !live) return;
    setNudge((x) => x + 1);
    const giver = clueGiverOf(game, game.turn)?.name ?? s.team[game.turn];
    setSaid(game.pending ? b.penaltyWait : b.waitingClue(giver));
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
    // Only the host's device acts on the board; any other signed-in account is watching (ISH-F11, ISH-F22).
    host: table.me?.host ?? false,
    conn,
    live,
    canSend,
    canPick,
    active,
    finished,
    endedOnCard,
    serverNow,
    selected,
    setSelected,
    moment,
    notice,
    handoff,
    nudge,
    blocked,
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
